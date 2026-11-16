const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;

// Render uyku moduna geçmesin veya sağlık kontrolü (health check) başarılı dönsün diye HTTP sunucusu
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("AoH2 Definitive Edition Multiplayer Relay Server Aktif!");
});

const wss = new WebSocket.Server({ server });

// Aktif Odalar: roomId -> { id, name, hostId, hostNick, scenarioTag, settings, players: Map, takenCivs: Set }
const rooms = new Map();

function broadcastRoomList() {
  const list = [];
  for (const [id, room] of rooms.entries()) {
    list.push(`${id},${room.name},${room.hostNick},${room.players.size},16,${room.scenarioTag}`);
  }
  const msg = "ROOM_LIST|" + list.join("|");
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && !client.roomId) {
      client.send(msg);
    }
  });
}

function broadcastPlayerList(room) {
  if (!room) return;
  const list = [];
  for (const [pid, p] of room.players.entries()) {
    list.push(`${pid},${p.nick},${p.civId},${pid === room.hostId ? "1" : "0"},${p.isReady ? "1" : "0"}`);
  }
  const msg = "PLAYER_LIST|" + list.join("|");
  for (const [, p] of room.players.entries()) {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  }
}

function broadcastToRoom(room, data, isBinary = false, excludeId = null) {
  if (!room) return;
  for (const [pid, p] of room.players.entries()) {
    if (pid !== excludeId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data, { binary: isBinary });
    }
  }
}

let nextPlayerId = 1;

wss.on("connection", (ws) => {
  ws.playerId = String(nextPlayerId++);
  ws.nick = "Player_" + ws.playerId;
  ws.roomId = null;

  ws.on("message", (rawData, isBinary) => {
    // 1. İkili (Binary) Dünya veya Senaryo Paketi (GZIP byte[])
    if (isBinary) {
      if (!ws.roomId) return;
      const room = rooms.get(ws.roomId);
      if (room && ws.playerId === room.hostId) {
        broadcastToRoom(room, rawData, true, ws.playerId);
      }
      return;
    }

    // 2. Metin Tabanlı Komutlar
    const msg = rawData.toString("utf8").trim();
    const parts = msg.split("|");
    const cmd = parts;

    if (cmd === "HELLO" && parts) {
      ws.nick = parts.trim() || ws.nick;
      broadcastRoomList();
    } else if (cmd === "LIST_ROOMS") {
      broadcastRoomList();
    } else if (cmd === "CREATE_ROOM") {
      const roomName = (parts || "Oda").trim();
      const hostNick = (parts || ws.nick).trim();
      const scenarioTag = (parts || "default").trim();
      ws.nick = hostNick;

      const roomId = "R" + Date.now().toString(36).toUpperCase();
      const room = {
        id: roomId,
        name: roomName,
        hostId: ws.playerId,
        hostNick: hostNick,
        scenarioTag: scenarioTag,
        settings: null,
        players: new Map(),
        takenCivs: new Set()
      };
      room.players.set(ws.playerId, { ws, nick: hostNick, civId: -1, isReady: false });
      rooms.set(roomId, room);
      ws.roomId = roomId;

      ws.send(`ROOM_CREATED|${roomId}`);
      broadcastPlayerList(room);
      broadcastRoomList();
    } else if (cmd === "JOIN_ROOM" && parts) {
      const roomId = parts.trim();
      const nick = (parts || ws.nick).trim();
      const room = rooms.get(roomId);
      if (!room) {
        ws.send("ERROR|Oda bulunamadi");
        return;
      }
      ws.nick = nick;
      ws.roomId = roomId;
      room.players.set(ws.playerId, { ws, nick, civId: -1, isReady: false });

      if (room.settings) {
        ws.send(room.settings);
      }
      broadcastPlayerList(room);
      broadcastRoomList();
    } else if (cmd === "SELECT_CIV" && parts && parts) {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const civId = parseInt(parts, 10);
      const player = room.players.get(ws.playerId);
      if (!player) return;

      // Ülke başka biri tarafından seçildiyse engelle
      if (room.takenCivs.has(civId) && player.civId !== civId) {
        ws.send("ERROR|Bu ulke baska bir oyuncu tarafindan secildi!");
        return;
      }
      if (player.civId > 0) {
        room.takenCivs.delete(player.civId);
      }
      player.civId = civId;
      if (civId > 0) {
        room.takenCivs.add(civId);
      }
      broadcastPlayerList(room);
    } else if (cmd === "SYNC_SETTINGS") {
      const room = rooms.get(ws.roomId);
      if (room && ws.playerId === room.hostId) {
        room.settings = msg;
        broadcastToRoom(room, msg, false, ws.playerId);
      }
    } else if (cmd === "PLAYER_READY" && parts) {
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const player = room.players.get(ws.playerId);
      if (!player) return;

      // Tur atlamadan vazgeçme yok: sadece "1" (hazır) kabul edilir
      if (parts === "1") {
        player.isReady = true;
      }
      broadcastPlayerList(room);

      // Odadaki herkes hazırsa turu ilerlet sinyali gönder
      let allReady = true;
      for (const [, p] of room.players.entries()) {
        if (!p.isReady) {
          allReady = false;
          break;
        }
      }
      if (allReady && room.players.size > 0) {
        for (const [, p] of room.players.entries()) {
          p.isReady = false;
        }
        broadcastToRoom(room, "ALL_READY", false, null);
        broadcastPlayerList(room);
      }
    } else if (cmd === "START_GAME") {
      const room = rooms.get(ws.roomId);
      if (room && ws.playerId === room.hostId) {
        broadcastToRoom(room, "GAME_STARTED", false, null);
      }
    } else if (cmd === "DIPLO_EVENT") {
      // Anlık diplomasi (ittifak, savaş ilanı, barış, ticaret) paketini odaya ilet
      const room = rooms.get(ws.roomId);
      if (room) {
        broadcastToRoom(room, msg, false, ws.playerId);
      }
    }
  });

  ws.on("close", () => {
    if (!ws.roomId) return;
    const room = rooms.get(ws.roomId);
    if (!room) return;

    const leavingPlayer = room.players.get(ws.playerId);
    if (leavingPlayer && leavingPlayer.civId > 0) {
      room.takenCivs.delete(leavingPlayer.civId);
      // Yönettiği ülkeyi AI'ya devretme bilgisini odadaki herkese gönder
      broadcastToRoom(room, `PLAYER_LEFT_AI|${ws.playerId}|${leavingPlayer.civId}`, false, ws.playerId);
    }

    room.players.delete(ws.playerId);

    if (room.players.size === 0) {
      rooms.delete(ws.roomId);
    } else {
      // Eğer çıkan kişi Host ise yetkiyi sıradaki oyuncuya devret
      if (ws.playerId === room.hostId) {
        const nextEntry = room.players.entries().next().value;
        room.hostId = nextEntry;
        room.hostNick = nextEntry.nick;
      }
      broadcastPlayerList(room);
    }
    broadcastRoomList();
  });
});

server.listen(PORT, () => {
  console.log("AoH2 DE Multiplayer Server port " + PORT + " uzerinde aktif.");
});
