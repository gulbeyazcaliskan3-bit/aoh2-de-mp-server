const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { renderWebPage } = require('./web');

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = 'tuef7603316';
const MAX_ROOMS = 500;
const JOIN_TIMEOUT_MS = 25000;
const HEARTBEAT_INTERVAL_MS = 12000;
const STALE_SWEEP_MS = 10000;

const rooms = new Map();
const waiting = new Map();
const games = new Map();
let nextClientId = 1;
const startTime = Date.now();

const serverState = {
  announcement: 'Welcome to AoH2 DE Turgut Edition Multiplayer! Server is online.',
  maintenanceMode: false,
  downloadUrl: '',
  downloadLabel: 'Download APK (v1.0)'
};

function getClientFingerprint(req) {
  const fwd = req.headers['x-forwarded-for'];
  const rawIp = Array.isArray(fwd)
    ? fwd.at(0)
    : typeof fwd === 'string'
      ? fwd.split(',').at(0).trim()
      : (req.socket && req.socket.remoteAddress) || 'unknown';
  return crypto.createHash('sha256').update(String(rawIp)).digest('hex').slice(0, 16);
}

function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function parseInfo(line) {
  if (!line || typeof line !== 'string') return null;
  const p = line.split('\t');
  if (p.length < 6 || p.at(0) !== 'I' || p.at(1) !== '1') return null;

  const passFlag = p.at(2) === '1' ? '1' : '0';
  const playersStr = p.at(3) || '1';
  const turnStr = p.at(4) || '1';

  const hasPass = passFlag === '1';
  const players = Math.max(1, Number(playersStr) || 1);
  const turn = Math.max(1, Number(turnStr) || 1);
  const rawMapScen = (p.at(5) || '').replace(/[\x00-\x1f]/g, '').trim().slice(0, 80);
  const hostNick = (p.at(6) || 'Host').replace(/[\x00-\x1f]/g, '').trim().slice(0, 32) || 'Host';

  let mapName = 'Earth';
  let scenarioName = rawMapScen || '1440';

  if (rawMapScen.includes(' - ')) {
    const idx = rawMapScen.indexOf(' - ');
    mapName = rawMapScen.slice(0, idx).trim() || 'Earth';
    scenarioName = rawMapScen.slice(idx + 3).trim() || '1440';
  } else if (rawMapScen.includes('|')) {
    const idx = rawMapScen.indexOf('|');
    mapName = rawMapScen.slice(0, idx).trim() || 'Earth';
    scenarioName = rawMapScen.slice(idx + 1).trim() || '1440';
  } else if (rawMapScen.includes('/')) {
    const idx = rawMapScen.indexOf('/');
    mapName = rawMapScen.slice(0, idx).trim() || 'Earth';
    scenarioName = rawMapScen.slice(idx + 1).trim() || '1440';
  } else if (rawMapScen) {
    mapName = 'Earth';
    scenarioName = rawMapScen;
  }

  return {
    raw: `1\t${passFlag}\t${players}\t${turn}\t${rawMapScen || scenarioName}\t${hostNick}`,
    hasPass,
    players,
    turn,
    mapName,
    scenarioName,
    hostNick,
    updatedAt: Date.now()
  };
}

function purgeDeadEntries() {
  for (const [code, roomObj] of rooms.entries()) {
    if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) {
      rooms.delete(code);
      games.delete(code);
    }
  }
  for (const [code] of games.entries()) {
    if (!rooms.has(code)) {
      games.delete(code);
    }
  }
  for (const [wKey, waitObj] of waiting.entries()) {
    if (!waitObj || !waitObj.ws || waitObj.ws.readyState !== 1) {
      waiting.delete(wKey);
    }
  }
}

setInterval(purgeDeadEntries, STALE_SWEEP_MS);

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 32768) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function closeRoomByCode(code) {
  const roomObj = rooms.get(code);
  rooms.delete(code);
  games.delete(code);
  if (roomObj && roomObj.ws && roomObj.ws.readyState === 1) {
    try {
      roomObj.ws.close();
    } catch (_) {}
  }
}
const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  if (url.startsWith('/config')) {
    const hostHeader = req.headers.host || 'aoh2-de-mp-server.onrender.com';
    const cleanNotice = (serverState.announcement || '/')
      .replace(/[\r\n]+/g, ' ')
      .trim()
      .slice(0, 180) || '/';

    const regionLine = serverState.maintenanceMode
      ? `${hostHeader}:443,MAINTENANCE;`
      : `${hostHeader}:443,TR-EU;`;

    const body = `${regionLine}\n1.0\n${cleanNotice}\n/\n`;
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(body);
    return;
  }

  if (url.startsWith('/api/lobby')) {
    purgeDeadEntries();

    const lobbies = [];
    const uniqueDevices = new Set();
    let totalRoomPlayers = 0;
    let publicRooms = 0;

    for (const [code, roomObj] of rooms.entries()) {
      if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) continue;
      if (roomObj.deviceId) {
        uniqueDevices.add(roomObj.deviceId);
      }

      const connectedGuests = roomObj.guests ? roomObj.guests.size : 0;
      const g = games.get(code);

      if (g && g.parsed) {
        const realPlayers = Math.max(g.parsed.players, 1 + connectedGuests);
        lobbies.push({
          code,
          hostNick: g.parsed.hostNick,
          mapName: g.parsed.mapName,
          scenarioName: g.parsed.scenarioName,
          turn: g.parsed.turn,
          players: realPlayers,
          hasPass: g.parsed.hasPass,
          uptimeSec: Math.floor((Date.now() - (roomObj.createdAt || Date.now())) / 1000)
        });
        totalRoomPlayers += realPlayers;
        publicRooms++;
      } else {
        totalRoomPlayers += (1 + connectedGuests);
      }
    }

    const activePlayers = Math.max(totalRoomPlayers, uniqueDevices.size);

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      activeRooms: rooms.size,
      publicRooms,
      activePlayers,
      maintenanceMode: serverState.maintenanceMode,
      announcement: serverState.announcement,
      downloadUrl: serverState.downloadUrl,
      downloadLabel: serverState.downloadLabel,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      lobbies
    }));
    return;
  }

  if (url.startsWith('/api/admin') && req.method === 'POST') {
    const body = await readJsonBody(req);
    if (body.password !== ADMIN_PASS) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'Invalid admin password' }));
      return;
    }

    const action = body.action || 'status';

    if (action === 'update_settings') {
      if (typeof body.announcement === 'string') {
        serverState.announcement = body.announcement.replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
      }
      if (typeof body.maintenanceMode === 'boolean') {
        serverState.maintenanceMode = body.maintenanceMode;
      }
      if (typeof body.downloadUrl === 'string') {
        serverState.downloadUrl = body.downloadUrl.trim().slice(0, 300);
      }
      if (typeof body.downloadLabel === 'string' && body.downloadLabel.trim()) {
        serverState.downloadLabel = body.downloadLabel.trim().slice(0, 48);
      }
    } else if (action === 'kick_room' && typeof body.code === 'string') {
      closeRoomByCode(body.code.trim().toUpperCase());
    } else if (action === 'clear_all_rooms') {
      for (const code of Array.from(rooms.keys())) {
        closeRoomByCode(code);
      }
      waiting.clear();
    }

    purgeDeadEntries();
    const adminRooms = [];
    for (const [code, roomObj] of rooms.entries()) {
      const g = games.get(code);
      const guestCount = roomObj.guests ? roomObj.guests.size : 0;
      adminRooms.push({
        code,
        hostNick: g && g.parsed ? g.parsed.hostNick : 'Private Host',
        mapName: g && g.parsed ? g.parsed.mapName : 'Earth',
        scenarioName: g && g.parsed ? g.parsed.scenarioName : 'Private',
        turn: g && g.parsed ? g.parsed.turn : 1,
        players: g && g.parsed ? Math.max(g.parsed.players, 1 + guestCount) : (1 + guestCount),
        hasPass: g && g.parsed ? g.parsed.hasPass : true,
        ageSec: Math.floor((Date.now() - (roomObj.createdAt || Date.now())) / 1000)
      });
    }

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      ok: true,
      state: serverState,
      stats: {
        activeRooms: rooms.size,
        publicRooms: games.size,
        waitingClients: waiting.size,
        uptimeSec: Math.floor((Date.now() - startTime) / 1000)
      },
      rooms: adminRooms
    }));
    return;
  }

  if (url.startsWith('/health')) {
    purgeDeadEntries();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      activeRooms: rooms.size,
      publicRooms: games.size,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000)
    }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(renderWebPage());
});
const wss = new WebSocketServer({
  server,
  maxPayload: 256 * 1024 * 1024,
  perMessageDeflate: false
});

wss.on('connection', (ws, req) => {
  const deviceId = getClientFingerprint(req);
  ws.isAlive = true;
  ws.deviceId = deviceId;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let buffer = Buffer.alloc(0);
  let state = 'HANDSHAKE';
  let roomCode = null;
  let joinedRoomCode = null;
  let infoKey = null;
  let peerWs = null;
  let cleaned = false;

  function sendLine(str) {
    if (ws.readyState === 1) {
      try {
        ws.send(Buffer.from(str + '\n', 'utf8'));
      } catch (_) {}
    }
  }

  function cleanup() {
    if (cleaned) return;
    cleaned = true;

    if (roomCode) {
      const current = rooms.get(roomCode);
      if (current && current.ws === ws) {
        if (current.guests) {
          for (const guestWs of current.guests) {
            if (guestWs && guestWs.readyState === 1) {
              try {
                guestWs.close();
              } catch (_) {}
            }
          }
        }
        rooms.delete(roomCode);
        games.delete(roomCode);
      }
      roomCode = null;
    }

    if (joinedRoomCode) {
      const hostRoom = rooms.get(joinedRoomCode);
      if (hostRoom && hostRoom.guests) {
        hostRoom.guests.delete(ws);
      }
      joinedRoomCode = null;
    }

    if (infoKey) {
      games.delete(infoKey);
      infoKey = null;
    }

    for (const [wKey, waitObj] of waiting.entries()) {
      if (waitObj && waitObj.ws === ws) {
        waiting.delete(wKey);
      }
    }

    if (peerWs) {
      const target = peerWs;
      peerWs = null;
      if (target.readyState === 1) {
        try {
          target.close();
        } catch (_) {}
      }
    }
  }

  ws.on('message', (data) => {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (state === 'PIPE') {
      if (peerWs && peerWs.readyState === 1) {
        try {
          peerWs.send(chunk);
        } catch (_) {
          cleanup();
        }
      }
      return;
    }

    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > 65536) {
      cleanup();
      try {
        ws.close();
      } catch (_) {}
      return;
    }

    let nlIdx;
    while ((nlIdx = buffer.indexOf(10)) !== -1) {
      const line = buffer.slice(0, nlIdx).toString('utf8').trim();
      buffer = buffer.slice(nlIdx + 1);

      if (state === 'HOST_INFO') {
        if (infoKey && games.has(infoKey)) {
          const entry = games.get(infoKey);
          const parsed = parseInfo(line);
          if (parsed) {
            entry.parsed = parsed;
            entry.info = parsed.raw;
          }
        }
        continue;
      }

      if (state === 'HANDSHAKE') {
        const parts = line.split(' ');
        const cmd = parts.at(0);

        if (parts.length === 1 && cmd === 'H' && rooms.size < MAX_ROOMS && !serverState.maintenanceMode) {
          for (const [oldCode, oldRoom] of rooms.entries()) {
            if (oldRoom && oldRoom.deviceId === deviceId) {
              closeRoomByCode(oldCode);
            }
          }

          roomCode = newCode();
          rooms.set(roomCode, {
            ws,
            deviceId,
            guests: new Set(),
            createdAt: Date.now()
          });
          infoKey = roomCode;
          games.set(infoKey, { type: 'O', info: null, parsed: null });
          state = 'HOST_INFO';
          sendLine('C ' + roomCode);
        } else if (parts.length === 1 && cmd === 'L') {
          purgeDeadEntries();
          let out = '';
          for (const [k, v] of games.entries()) {
            if (v && v.info && rooms.has(k)) {
              out += `S\t${v.type}\t${k}\t${v.info}\n`;
            }
          }
          out += '.\n';
          if (ws.readyState === 1) {
            try {
              ws.send(Buffer.from(out, 'utf8'));
            } catch (_) {}
          }
          try {
            ws.close();
          } catch (_) {}
          return;
        } else if (parts.length === 2 && cmd === 'Q') {
          const code = parts.at(1);
          const roomObj = rooms.get(code);
          const exists = Boolean(roomObj && roomObj.ws && roomObj.ws.readyState === 1);
          sendLine(exists ? 'Y' : 'N');
          try {
            ws.close();
          } catch (_) {}
          return;
        } else if (parts.length === 2 && cmd === 'J') {
          const targetCode = parts.at(1);
          const roomObj = rooms.get(targetCode);
          if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) {
            try {
              ws.close();
            } catch (_) {}
            return;
          }
          const cid = String(nextClientId++);
          const waitKey = `${targetCode} ${cid}`;
          waiting.set(waitKey, { ws, deviceId, targetCode });
          state = 'WAITING_PIPE';
          try {
            roomObj.ws.send(Buffer.from(`N ${cid}\n`, 'utf8'));
          } catch (_) {
            waiting.delete(waitKey);
            try {
              ws.close();
            } catch (_) {}
            return;
          }

          setTimeout(() => {
            if (waiting.has(waitKey)) {
              waiting.delete(waitKey);
              if (ws.readyState === 1) {
                try {
                  ws.close();
                } catch (_) {}
              }
            }
          }, JOIN_TIMEOUT_MS);
          return;
        } else if (parts.length === 3 && cmd === 'D' && rooms.has(parts.at(1))) {
          const tCode = parts.at(1);
          const waitKey = `${tCode} ${parts.at(2)}`;
          const waitObj = waiting.get(waitKey);
          waiting.delete(waitKey);
          if (!waitObj || !waitObj.ws || waitObj.ws.readyState !== 1) {
            try {
              ws.close();
            } catch (_) {}
            return;
          }

          const hostRoom = rooms.get(tCode);
          if (hostRoom && hostRoom.guests) {
            hostRoom.guests.add(waitObj.ws);
          }

          peerWs = waitObj.ws;
          waitObj.ws._setPeer(ws, tCode);
          state = 'PIPE';

          if (buffer.length > 0 && peerWs.readyState === 1) {
            try {
              peerWs.send(buffer);
            } catch (_) {}
            buffer = Buffer.alloc(0);
          }
          return;
        } else {
          try {
            ws.close();
          } catch (_) {}
          return;
        }
      }
    }
  });

  ws._setPeer = (target, tCode) => {
    peerWs = target;
    joinedRoomCode = tCode || null;
    state = 'PIPE';
    if (buffer.length > 0 && peerWs.readyState === 1) {
      try {
        peerWs.send(buffer);
      } catch (_) {}
      buffer = Buffer.alloc(0);
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try {
        ws.terminate();
      } catch (_) {}
      return;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (_) {}
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeat);
});

server.listen(PORT, () => {
  console.log('AoH2DE Turgut Edition MP Dedicated Relay & Admin Server listening on port ' + PORT);
});
