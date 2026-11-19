const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { renderWebPage } = require('./web');
const { startKeepAlive } = require('./keepalive');
const {
  ADMIN_PASS,
  serverState,
  bannedDevices,
  vipDevices,
  lobbyChat,
  resolvePermanentDeviceId,
  touchDevice,
  pushChatMessage,
  handleGameSync,
  handleAdminAction
} = require('./admin_core');

const PORT = process.env.PORT || 10000;
const MAX_ROOMS = 500;
const JOIN_TIMEOUT_MS = 25000;
const HEARTBEAT_INTERVAL_MS = 12000;
const STALE_SWEEP_MS = 10000;

const rooms = new Map();
const waiting = new Map();
const games = new Map();
let nextClientId = 1;
const startTime = Date.now();

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

  if (url.startsWith('/api/game/sync') && req.method === 'POST') {
    const body = await readJsonBody(req);
    const result = handleGameSync(req, body, null);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(result));
    return;
  }

  if (url.startsWith('/api/chat')) {
    if (req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ ok: true, chat: lobbyChat.slice(-40) }));
      return;
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const devId = resolvePermanentDeviceId(req, body.deviceId);
      if (bannedDevices.has(devId)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Device banned' }));
        return;
      }
      const isAdmin = body.adminPass === ADMIN_PASS;
      const senderNick = isAdmin ? 'Turgut Efe' : (body.nick || 'Player');
      touchDevice(devId, senderNick, 'Lobi Sohbetinde', '-');
      const msg = pushChatMessage(isAdmin ? 'ADMIN' : devId, senderNick, body.text, isAdmin);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: Boolean(msg), deviceId: devId, chat: lobbyChat.slice(-40) }));
      return;
    }
  }

  if (url.startsWith('/api/lobby')) {
    purgeDeadEntries();

    const lobbies = [];
    const uniqueDevices = new Set();
    let totalRoomPlayers = 0;
    let publicRooms = 0;

    for (const [code, roomObj] of rooms.entries()) {
      if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) continue;
      if (roomObj.deviceId) uniqueDevices.add(roomObj.deviceId);

      const connectedGuests = roomObj.guests ? roomObj.guests.size : 0;
      const g = games.get(code);

      if (g && g.parsed) {
        const realPlayers = Math.max(g.parsed.players, 1 + connectedGuests);
        lobbies.push({
          code,
          hostId: roomObj.deviceId || 'AOH-000000',
          hostNick: g.parsed.hostNick,
          hostIsVip: Boolean(roomObj.deviceId && vipDevices.has(roomObj.deviceId)),
          mapName: g.parsed.mapName,
          scenarioName: g.parsed.scenarioName,
          turn: g.parsed.turn,
          players: realPlayers,
          hasPass: g.parsed.hasPass
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
      telegramUrl: serverState.telegramUrl,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      lobbies
    }));
    return;
  }

  if (url.startsWith('/api/admin') && req.method === 'POST') {
    const body = await readJsonBody(req);
    const out = handleAdminAction(body, {
      rooms,
      games,
      waiting,
      closeRoomByCode,
      purgeDeadEntries,
      startTime
    });
    res.writeHead(out.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(out.data));
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
  const customIdHeader = req.headers['x-device-id'] || '';
  const customNickHeader = req.headers['x-player-nick'] || '';
  const deviceId = resolvePermanentDeviceId(req, customIdHeader);

  if (bannedDevices.has(deviceId)) {
    try {
      ws.close(1008, 'Banned');
    } catch (_) {}
    return;
  }

  ws.isAlive = true;
  ws.deviceId = deviceId;
  touchDevice(deviceId, customNickHeader || null, 'Sunucuya Baglandi', '-');

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
      touchDevice(deviceId, null, 'Odayi Kapatti', '-');
      roomCode = null;
    }

    if (joinedRoomCode) {
      const hostRoom = rooms.get(joinedRoomCode);
      if (hostRoom && hostRoom.guests) {
        hostRoom.guests.delete(ws);
      }
      touchDevice(deviceId, null, 'Odadan Ayrildi', '-');
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
            touchDevice(
              deviceId,
              parsed.hostNick,
              `Oda Acik (${parsed.scenarioName} - Tur ${parsed.turn})`,
              infoKey
            );
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
          touchDevice(deviceId, customNickHeader || null, 'Oda Kurdu', roomCode);
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
          touchDevice(deviceId, customNickHeader || null, 'Odaya Katiliyor', targetCode);
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
    touchDevice(deviceId, null, 'Oyunda (Misafir)', tCode);
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
  console.log('AoH2DE Turgut Edition MP Dedicated Relay, KeepAlive & Admin Core listening on port ' + PORT);
  startKeepAlive();
});
