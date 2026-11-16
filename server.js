const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('AoH2 DE Multiplayer Server CANLI | Odalar: ' + rooms.size);
});

const wss = new WebSocket.Server({ server });

// roomId -> { id, name, scenarioTag, started, settings, players: Map<ws, playerObj> }
const rooms = new Map();
let nextRoomNum = 1;
let nextPlayerNum = 1;

function broadcastRoomList() {
  const listParts = ['ROOM_LIST'];
  for (const [id, room] of rooms.entries()) {
    if (room.started) continue;
    let hostNick = 'Host';
    for (const p of room.players.values()) {
      if (p.isHost) { hostNick = p.nick; break; }
    }
    const safeName = (room.name || 'Oda').replace(/[|,]/g, ' ');
    const safeHost = (hostNick || 'Host').replace(/[|,]/g, ' ');
    listParts.push(`${id},${safeName},${safeHost},${room.players.size},8,${room.scenarioTag || 'default'}`);
  }
  const msg = listParts.join('|');
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

function broadcastPlayerList(room) {
  if (!room) return;
  const parts = ['PLAYER_LIST'];
  for (const p of room.players.values()) {
    const safeNick = (p.nick || 'Oyuncu').replace(/[|,]/g, ' ');
    parts.push(`${p.id},${safeNick},${p.civId},${p.isHost ? '1' : '0'},${p.isReady ? '1' : '0'}`);
  }
  const msg = parts.join('|');
  for (const ws of room.players.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function sendToOthers(room, senderWs, data, isBinary) {
  if (!room) return;
  for (const ws of room.players.keys()) {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data, { binary: isBinary });
    }
  }
}

function leaveCurrentRoom(ws) {
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) return;
  const room = rooms.get(roomId);
  const leavingPlayer = room.players.get(ws);
  room.players.delete(ws);
  ws.roomId = null;

  if (room.players.size === 0) {
    rooms.delete(roomId);
  } else {
    if (leavingPlayer && leavingPlayer.isHost) {
      const nextHost = room.players.values().next().value;
      if (nextHost) nextHost.isHost = true;
    }
    if (leavingPlayer && leavingPlayer.civId > 0) {
      for (const clientWs of room.players.keys()) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(`PLAYER_LEFT_AI|${leavingPlayer.id}|${leavingPlayer.civId}`);
        }
      }
    }
    broadcastPlayerList(room);
  }
  broadcastRoomList();
}

wss.on('connection', (ws) => {
  ws.playerId = 'p_' + (nextPlayerNum++);
  ws.nick = 'Oyuncu_' + nextPlayerNum;
  ws.roomId = null;

  ws.on('message', (raw, isBinary) => {
    if (isBinary) {
      const room = rooms.get(ws.roomId);
      sendToOthers(room, ws, raw, true);
      return;
    }

    const msg = raw.toString('utf8').trim();
    if (!msg) return;

    if (msg === 'PING') {
      ws.send('PONG');
      return;
    }

    const parts = msg.split('|');
    const cmd = parts[0];

    if (cmd === 'HELLO' && parts[1]) {
      ws.nick = parts[1].trim() || ws.nick;
      const room = rooms.get(ws.roomId);
      if (room) {
        const p = room.players.get(ws);
        if (p) p.nick = ws.nick;
        broadcastPlayerList(room);
      }
      broadcastRoomList();
    } else if (cmd === 'LIST_ROOMS') {
      const listParts = ['ROOM_LIST'];
      for (const [id, room] of rooms.entries()) {
        if (room.started) continue;
        let hostNick = 'Host';
        for (const p of room.players.values()) {
          if (p.isHost) { hostNick = p.nick; break; }
        }
        const safeName = (room.name || 'Oda').replace(/[|,]/g, ' ');
        const safeHost = (hostNick || 'Host').replace(/[|,]/g, ' ');
        listParts.push(`${id},${safeName},${safeHost},${room.players.size},8,${room.scenarioTag || 'default'}`);
      }
      ws.send(listParts.join('|'));
    } else if (cmd === 'CREATE_ROOM') {
      leaveCurrentRoom(ws);
      const roomId = 'R' + (nextRoomNum++);
      const roomName = (parts[1] || 'Oda 1').trim();
      const scenarioTag = (parts[2] || 'default').trim();
      const room = {
        id: roomId,
        name: roomName,
        scenarioTag,
        started: false,
        settings: null,
        players: new Map()
      };
      room.players.set(ws, {
        id: ws.playerId,
        nick: ws.nick,
        civId: -1,
        isHost: true,
        isReady: false
      });
      rooms.set(roomId, room);
      ws.roomId = roomId;

      ws.send(`ROOM_CREATED|${roomId}`);
      broadcastPlayerList(room);
      broadcastRoomList();
    } else if (cmd === 'JOIN_ROOM' && parts[1]) {
      const targetId = parts[1].trim();
      const room = rooms.get(targetId);
      if (!room) {
        ws.send('ERROR|Oda bulunamadi veya kapandi');
        return;
      }
      if (room.started) {
        ws.send('ERROR|Bu oyun zaten basladi');
        return;
      }
      leaveCurrentRoom(ws);
      room.players.set(ws, {
        id: ws.playerId,
        nick: ws.nick,
        civId: -1,
        isHost: false,
        isReady: false
      });
      ws.roomId = targetId;

      if (room.settings) {
        ws.send(room.settings);
      }
      broadcastPlayerList(room);
      broadcastRoomList();
    } else if (cmd === 'SELECT_CIV' && parts[1]) {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const civId = parseInt(parts[1], 10) || -1;
      for (const [otherWs, p] of room.players.entries()) {
        if (otherWs !== ws && p.civId === civId && civId > 0) {
          ws.send('ERROR|Bu ulke baska bir oyuncu tarafindan secildi');
          return;
        }
      }
      const me = room.players.get(ws);
      if (me) me.civId = civId;
      broadcastPlayerList(room);
    } else if (cmd === 'SYNC_SETTINGS') {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      room.settings = msg;
      sendToOthers(room, ws, msg, false);
    } else if (cmd === 'START_GAME') {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      room.started = true;
      for (const clientWs of room.players.keys()) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send('GAME_STARTED');
        }
      }
      broadcastRoomList();
    } else if (cmd === 'PLAYER_READY' && parts[1]) {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const me = room.players.get(ws);
      if (me) me.isReady = parts[1] === '1';
      broadcastPlayerList(room);

      let allReady = room.players.size > 0;
      for (const p of room.players.values()) {
        if (!p.isReady) { allReady = false; break; }
      }
      if (allReady) {
        for (const p of room.players.values()) p.isReady = false;
        for (const clientWs of room.players.keys()) {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send('ALL_READY');
          }
        }
        broadcastPlayerList(room);
      }
    } else if (cmd.startsWith('FILE_')) {
      const room = rooms.get(ws.roomId);
      sendToOthers(room, ws, msg, false);
    }
  });

  ws.on('close', () => {
    leaveCurrentRoom(ws);
  });
});

server.listen(PORT, () => {
  console.log('AoH2 DE MP Server running on port', PORT);
});
