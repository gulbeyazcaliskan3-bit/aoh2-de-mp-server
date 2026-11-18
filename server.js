const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const MAX_ROOMS = 1000;
const JOIN_TIMEOUT_MS = 20000;
const HEARTBEAT_INTERVAL_MS = 20000;

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
  if (!line) return null;
  const p = line.split('\t');
  if (p.length !== 7 || p.at(0) !== 'I' || p.at(1) !== '1') return null;
  if (!/^[01]$/.test(p.at(2)) || !/^[0-9]{1,3}$/.test(p.at(3)) || !/^[0-9]{1,6}$/.test(p.at(4))) {
    return null;
  }
  const mapName = p.at(5).replace(/[\x00-\x1f]/g, '').trim().slice(0, 60);
  const hostNick = p.at(6).replace(/[\x00-\x1f]/g, '').trim().slice(0, 32);
  return `${p.at(1)}\t${p.at(2)}\t${p.at(3)}\t${p.at(4)}\t${mapName}\t${hostNick}`;
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url.startsWith('/config')) {
    const hostHeader = req.headers.host || 'aoh2-de-mp-server.onrender.com';
    const body = `${hostHeader}:443,TR-EU;\n/\n/\n/\n`;
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(body);
    return;
  }

  if (url.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      publicGames: games.size,
      waitingClients: waiting.size,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000)
    }));
    return;
  }

  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(
    `AoH2DE Turgut Edition MP Relay Active\n` +
    `Aktif Odalar: ${rooms.size}\n` +
    `Listelenen Oyunlar: ${games.size}\n` +
    `Calisma Suresi: ${uptimeSec} sn\n`
  );
});

const wss = new WebSocketServer({
  server,
  maxPayload: 256 * 1024 * 1024
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let buffer = Buffer.alloc(0);
  let state = 'HANDSHAKE';
  let roomCode = null;
  let infoKey = null;
  let peerWs = null;

  function sendLine(str) {
    if (ws.readyState === 1) {
      ws.send(Buffer.from(str + '\n', 'utf8'));
    }
  }

  function cleanup() {
    if (roomCode) {
      rooms.delete(roomCode);
      roomCode = null;
    }
    if (infoKey) {
      games.delete(infoKey);
      infoKey = null;
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
        peerWs.send(chunk);
      }
      return;
    }

    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > 65536) {
      ws.close();
      return;
    }

    let nlIdx;
    while ((nlIdx = buffer.indexOf(10)) !== -1) {
      const line = buffer.slice(0, nlIdx).toString('utf8').trim();
      buffer = buffer.slice(nlIdx + 1);

      if (state === 'HOST_INFO') {
        if (infoKey && games.has(infoKey)) {
          const entry = games.get(infoKey);
          entry.info = parseInfo(line);
        }
        continue;
      }

      if (state === 'HANDSHAKE') {
        const parts = line.split(' ');
        const cmd = parts.at(0);

        if (parts.length === 1 && cmd === 'H' && rooms.size < MAX_ROOMS) {
          roomCode = newCode();
          rooms.set(roomCode, ws);
          infoKey = roomCode;
          games.set(infoKey, { type: 'O', info: null });
          state = 'HOST_INFO';
          sendLine('C ' + roomCode);
        } else if (parts.length === 1 && cmd === 'L') {
          let out = '';
          for (const [k, v] of games.entries()) {
            if (v && v.info) {
              out += `S\t${v.type}\t${k}\t${v.info}\n`;
            }
          }
          out += '.\n';
          if (ws.readyState === 1) {
            ws.send(Buffer.from(out, 'utf8'));
          }
          ws.close();
          return;
        } else if (parts.length === 2 && cmd === 'Q') {
          const code = parts.at(1);
          const hostWs = rooms.get(code);
          const exists = Boolean(hostWs && hostWs.readyState === 1);
          sendLine(exists ? 'Y' : 'N');
          ws.close();
          return;
        } else if (parts.length === 2 && cmd === 'J') {
          const targetCode = parts.at(1);
          const hostWs = rooms.get(targetCode);
          if (!hostWs || hostWs.readyState !== 1) {
            ws.close();
            return;
          }
          const cid = String(nextClientId++);
          const waitKey = `${targetCode} ${cid}`;
          waiting.set(waitKey, ws);
          state = 'WAITING_PIPE';
          hostWs.send(Buffer.from(`N ${cid}\n`, 'utf8'));

          setTimeout(() => {
            if (waiting.has(waitKey)) {
              waiting.delete(waitKey);
              if (ws.readyState === 1) {
                ws.close();
              }
            }
          }, JOIN_TIMEOUT_MS);
          return;
        } else if (parts.length === 3 && cmd === 'D' && rooms.has(parts.at(1))) {
          const waitKey = `${parts.at(1)} ${parts.at(2)}`;
          const clientWs = waiting.get(waitKey);
          waiting.delete(waitKey);
          if (!clientWs || clientWs.readyState !== 1) {
            ws.close();
            return;
          }
          peerWs = clientWs;
          clientWs._setPeer(ws);
          state = 'PIPE';

          if (buffer.length > 0 && peerWs.readyState === 1) {
            peerWs.send(buffer);
            buffer = Buffer.alloc(0);
          }
          return;
        } else {
          ws.close();
          return;
        }
      }
    }
  });

  ws._setPeer = (target) => {
    peerWs = target;
    state = 'PIPE';
    if (buffer.length > 0 && peerWs.readyState === 1) {
      peerWs.send(buffer);
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
  console.log('AoH2DE Turgut Edition MP Relay listening on port ' + PORT);
});
