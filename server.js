const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const rooms = new Map();
const waiting = new Map();
const games = new Map();
let nextId = 1;

function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(0, chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function parseInfo(line) {
  const p = line.split('\t');
  if (p.length !== 7 || p[0] !== 'I' || p[1] !== '1') return null;
  if (!/^[01]$/.test(p[2]) || !/^[0-9]{1,3}$/.test(p[3]) || !/^[0-9]{1,6}$/.test(p[4])) return null;
  const mapName = p[5].replace(/[\x00-\x1f]/g, '').trim().slice(0, 60);
  const hostNick = p[6].replace(/[\x00-\x1f]/g, '').trim().slice(0, 32);
  return `${p[1]}\t${p[2]}\t${p[3]}\t${p[4]}\t${mapName}\t${hostNick}`;
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/config')) {
    const hostHeader = req.headers.host || 'aoh2de-mp . onrender . com';
    const body = `${hostHeader}:443,TR-EU\n2.5\nSunucu aktif.\n/\n`;
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(body);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('AoH2DE MP Relay Active');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
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

  ws.on('message', (data) => {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (state === 'PIPE') {
      if (peerWs && peerWs.readyState === 1) {
        peerWs.send(chunk);
      }
      return;
    }

    buffer = Buffer.concat([buffer, chunk]);
    let nlIdx;
    while ((nlIdx = buffer.indexOf(10)) !== -1) {
      const line = buffer.slice(0, nlIdx).toString('utf8').trim();
      buffer = buffer.slice(nlIdx + 1);

      if (state === 'HOST_INFO') {
        if (infoKey && games.has(infoKey)) {
          const entry = games.get(infoKey);
          entry[1] = parseInfo(line);
        }
        continue;
      }

      if (state === 'HANDSHAKE') {
        const parts = line.split(' ');
        if (parts.length === 1 && parts[0] === 'H' && rooms.size < 1000) {
          roomCode = newCode();
          rooms.set(roomCode, ws);
          infoKey = roomCode;
          games.set(infoKey, ['O', null]);
          state = 'HOST_INFO';
          sendLine('C ' + roomCode);
        } else if (parts.length === 1 && parts[0] === 'L') {
          let out = '';
          for (const [k, v] of games.entries()) {
            if (v[1]) out += `S\t${v[0]}\t${k}\t${v[1]}\n`;
          }
          out += '.\n';
          if (ws.readyState === 1) ws.send(Buffer.from(out, 'utf8'));
          ws.close();
          return;
        } else if (parts.length === 2 && parts[0] === 'Q') {
          sendLine(rooms.has(parts[1]) ? 'Y' : 'N');
          ws.close();
          return;
        } else if (parts.length === 2 && parts[0] === 'J') {
          const hostWs = rooms.get(parts[1]);
          if (!hostWs || hostWs.readyState !== 1) {
            ws.close();
            return;
          }
          const cid = String(nextId++);
          const waitKey = `${parts[1]} ${cid}`;
          waiting.set(waitKey, ws);
          state = 'WAITING_PIPE';
          hostWs.send(Buffer.from(`N ${cid}\n`, 'utf8'));
          setTimeout(() => {
            if (waiting.has(waitKey)) {
              waiting.delete(waitKey);
              ws.close();
            }
          }, 15000);
          return;
        } else if (parts.length === 3 && parts[0] === 'D' && rooms.has(parts[1])) {
          const waitKey = `${parts[1]} ${parts[2]}`;
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

  ws.on('close', () => {
    if (roomCode) rooms.delete(roomCode);
    if (infoKey) games.delete(infoKey);
    if (peerWs && peerWs.readyState === 1) peerWs.close();
  });
});

server.listen(PORT, () => {
  console.log('AoH2DE MP Relay WS listening on ' + PORT);
});
