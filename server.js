const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = process.env.ADMIN_PASS || "tuef7603316";

const devices = new Map();
const bannedIds = new Set();
const vipIds = new Set();
const pendingCommands = new Map();
const rooms = new Map();

const chatHistory = [
  {
    id: "welcome-1",
    deviceId: "SYSTEM",
    nick: "Turgut Efe",
    text: "Welcome to AoH2 Definitive Edition Turgut Multiplayer!",
    isAdmin: true,
    isVip: true,
    ts: Date.now()
  }
];

let latestNoticeId = "notice-" + Date.now();
let latestAnnouncement = "Welcome to AoH2 DE Turgut Edition Multiplayer! Join or create a room.";

const DEFAULT_SCENARIOS = {
  "0": "Modern World",
  "1": "1440",
  "2": "World War II",
  "3": "1200",
  "4": "Victorian Era",
  "5": "5",
  "6": "1440 - Alternate",
  "7": "World War I"
};

function resolveScenarioName(rawScen, hostDeviceId, hostNick) {
  if (hostDeviceId && devices.has(hostDeviceId)) {
    const dev = devices.get(hostDeviceId);
    if (dev.scenario && dev.scenario !== "-" && dev.scenario !== "0") {
      return dev.scenario;
    }
  }
  if (hostNick) {
    const targetNick = String(hostNick).trim().toLowerCase();
    for (const dev of devices.values()) {
      if (dev.nick && dev.nick.trim().toLowerCase() === targetNick) {
        if (dev.scenario && dev.scenario !== "-" && dev.scenario !== "0") {
          return dev.scenario;
        }
      }
    }
  }
  const clean = String(rawScen || "").trim();
  if (!clean || clean === "-" || clean === "null" || clean === "undefined") {
    return "Modern World";
  }
  if (DEFAULT_SCENARIOS[clean]) {
    return DEFAULT_SCENARIOS[clean];
  }
  return clean;
}

function queueCommand(deviceId, type, payload) {
  if (!deviceId) return;
  if (!pendingCommands.has(deviceId)) {
    pendingCommands.set(deviceId, []);
  }
  pendingCommands.get(deviceId).push({
    type: String(type || "WARN"),
    payload: String(payload || ""),
    ts: Date.now()
  });
}

function sanitizeText(str, maxLen) {
  return String(str || "")
    .replace(/[\r\n\t<>]/g, " ")
    .trim()
    .slice(0, maxLen || 120);
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1048576) {
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function checkAdmin(req, body) {
  const headerPass = req.headers["x-admin-pass"];
  const bodyPass = body && body.password;
  return headerPass === ADMIN_PASS || bodyPass === ADMIN_PASS;
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass"
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/health" || pathname === "/ping") {
    return sendJson(res, 200, { ok: true, status: "running", ts: Date.now() });
  }

  if (pathname === "/api/game/sync" && req.method === "POST") {
    const body = await readBody(req);
    const deviceId = sanitizeText(body.deviceId || "AOH-UNKNOWN", 32).toUpperCase();
    const nick = sanitizeText(body.nick || "Player", 24) || "Player";
    const screen = sanitizeText(body.screen || "MAIN_MENU", 24);
    const rawRoomOrScen = sanitizeText(body.room || "-", 64);

    const prev = devices.get(deviceId) || {};
    const resolvedScen = (rawRoomOrScen && rawRoomOrScen !== "-" && rawRoomOrScen !== "0")
      ? rawRoomOrScen
      : (prev.scenario || "-");

    const now = Date.now();
    devices.set(deviceId, {
      deviceId,
      nick,
      screen,
      scenario: resolvedScen,
      isVip: vipIds.has(deviceId),
      isBanned: bannedIds.has(deviceId),
      lastSeen: now
    });

    for (const [roomId, r] of rooms.entries()) {
      if (r.hostDeviceId === deviceId || (r.host && r.host.toLowerCase() === nick.toLowerCase())) {
        r.hostDeviceId = deviceId;
        r.scenario = resolveScenarioName(r.rawScenario, deviceId, nick);
        r.updatedAt = now;
      }
    }

    const cmds = pendingCommands.get(deviceId) || [];
    if (cmds.length > 0) {
      pendingCommands.delete(deviceId);
    }

    if (bannedIds.has(deviceId) && !prev.banNotified) {
      devices.get(deviceId).banNotified = true;
      cmds.push({
        type: "BAN",
        payload: "Your device (" + deviceId + ") has been banned by Administrator Turgut Efe."
      });
    }

    return sendJson(res, 200, {
      ok: true,
      noticeId: latestNoticeId,
      announcement: latestAnnouncement,
      isVip: vipIds.has(deviceId),
      isBanned: bannedIds.has(deviceId),
      commands: cmds
    });
  }

  if (pathname === "/api/rooms" && req.method === "GET") {
    const now = Date.now();
    const list = [];
    for (const [id, r] of rooms.entries()) {
      if (now - r.updatedAt > 45000) {
        rooms.delete(id);
        continue;
      }
      list.push({
        id: r.id,
        name: r.name,
        host: r.host,
        hostDeviceId: r.hostDeviceId || "-",
        map: r.map || "Earth",
        scenario: resolveScenarioName(r.rawScenario, r.hostDeviceId, r.host),
        players: r.players || 1,
        maxPlayers: r.maxPlayers || 8,
        turn: r.turn || 1,
        hasPassword: Boolean(r.hasPassword),
        inGame: Boolean(r.inGame)
      });
    }
    return sendJson(res, 200, { ok: true, rooms: list, announcement: latestAnnouncement });
  }

  if (pathname === "/api/rooms/register" && req.method === "POST") {
    const body = await readBody(req);
    const id = sanitizeText(body.id || crypto.randomUUID(), 48);
    const hostDeviceId = sanitizeText(body.hostDeviceId || "", 32).toUpperCase();
    const host = sanitizeText(body.host || "Host", 24);
    const rawScenario = sanitizeText(body.scenario || body.scenarioName || "0", 64);

    if (hostDeviceId && bannedIds.has(hostDeviceId)) {
      return sendJson(res, 403, { ok: false, error: "Device is banned" });
    }

    rooms.set(id, {
      id,
      name: sanitizeText(body.name || (host + "'s Room"), 40),
      host,
      hostDeviceId,
      map: sanitizeText(body.map || "Earth", 32),
      rawScenario,
      scenario: resolveScenarioName(rawScenario, hostDeviceId, host),
      players: Math.max(1, Number(body.players) || 1),
      maxPlayers: Math.max(2, Number(body.maxPlayers) || 8),
      turn: Math.max(1, Number(body.turn) || 1),
      hasPassword: Boolean(body.hasPassword),
      inGame: Boolean(body.inGame),
      updatedAt: Date.now()
    });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === "/api/chat" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, chat: chatHistory.slice(-40) });
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    const body = await readBody(req);
    const deviceId = sanitizeText(body.deviceId || "WEB", 32).toUpperCase();
    if (bannedIds.has(deviceId)) {
      return sendJson(res, 403, { ok: false, error: "Banned device" });
    }
    const text = sanitizeText(body.text || "", 180);
    if (text) {
      const isAdmin = checkAdmin(req, body) || deviceId === "ADMIN";
      const nick = isAdmin ? "Turgut Efe" : (sanitizeText(body.nick || "Player", 24) || "Player");
      chatHistory.push({
        id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        deviceId,
        nick,
        text,
        isAdmin,
        isVip: isAdmin || vipIds.has(deviceId),
        ts: Date.now()
      });
      if (chatHistory.length > 80) {
        chatHistory.splice(0, chatHistory.length - 80);
      }
    }
    return sendJson(res, 200, { ok: true, chat: chatHistory.slice(-40) });
  }

  if (pathname === "/api/admin/state" && req.method === "POST") {
    const body = await readBody(req);
    if (!checkAdmin(req, body)) {
      return sendJson(res, 401, { ok: false, error: "Invalid admin password" });
    }
    const now = Date.now();
    const activeDevices = [];
    for (const dev of devices.values()) {
      activeDevices.push({
        ...dev,
        isVip: vipIds.has(dev.deviceId),
        isBanned: bannedIds.has(dev.deviceId),
        online: (now - dev.lastSeen) < 25000
      });
    }
    activeDevices.sort((a, b) => b.lastSeen - a.lastSeen);
    return sendJson(res, 200, {
      ok: true,
      devices: activeDevices,
      rooms: Array.from(rooms.values()),
      announcement: latestAnnouncement,
      noticeId: latestNoticeId,
      chat: chatHistory.slice(-40)
    });
  }

  if (pathname === "/api/admin/action" && req.method === "POST") {
    const body = await readBody(req);
    if (!checkAdmin(req, body)) {
      return sendJson(res, 401, { ok: false, error: "Invalid admin password" });
    }
    const action = String(body.action || "");
    const targetId = sanitizeText(body.deviceId || "", 32).toUpperCase();
    const message = sanitizeText(body.message || "", 240);

    if (action === "ANNOUNCE" && message) {
      latestAnnouncement = message;
      latestNoticeId = "notice-" + Date.now();
    } else if (action === "WARN" && targetId) {
      queueCommand(targetId, "WARN", message || "Official warning from Administrator Turgut Efe.");
    } else if (action === "KICK" && targetId) {
      queueCommand(targetId, "KICK", message || "You have been kicked from the room by Administrator Turgut Efe.");
      for (const [rId, r] of rooms.entries()) {
        if (r.hostDeviceId === targetId) rooms.delete(rId);
      }
    } else if (action === "BAN" && targetId) {
      bannedIds.add(targetId);
      if (devices.has(targetId)) devices.get(targetId).banNotified = true;
      queueCommand(targetId, "BAN", message || "Your device (" + targetId + ") has been permanently banned by Turgut Efe.");
      for (const [rId, r] of rooms.entries()) {
        if (r.hostDeviceId === targetId) rooms.delete(rId);
      }
    } else if (action === "UNBAN" && targetId) {
      bannedIds.delete(targetId);
      if (devices.has(targetId)) devices.get(targetId).banNotified = false;
    } else if (action === "VIP" && targetId) {
      if (vipIds.has(targetId)) {
        vipIds.delete(targetId);
      } else {
        vipIds.add(targetId);
      }
    } else if (action === "CLOSE_ROOM" && body.roomId) {
      rooms.delete(String(body.roomId));
    } else if (action === "CLEAR_CHAT") {
      chatHistory.length = 0;
    }

    return sendJson(res, 200, { ok: true });
  }
  const filePath = pathname === "/" ? path.join(__dirname, "index.html") : path.join(__dirname, pathname);
  if (filePath.startsWith(__dirname) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
});

const wss = new WebSocketServer({ server });
const relayClients = new Set();

const IDX_0 = 0;
const IDX_1 = 1;
const IDX_2 = 2;
const IDX_3 = 3;
const IDX_4 = 4;
const IDX_5 = 5;
const IDX_6 = 6;

const MAP_NAMES = {
  "0": "Earth",
  "1": "Kepler-22b",
  "2": "Europe",
  "3": "Asia",
  "4": "America"
};

wss.on("connection", (ws, req) => {
  const deviceId = sanitizeText(req.headers["x-device-id"] || "", 32).toUpperCase();
  let playerNick = "Player";
  try {
    playerNick = sanitizeText(decodeURIComponent(req.headers["x-player-nick"] || "Player"), 24) || "Player";
  } catch {
    playerNick = sanitizeText(req.headers["x-player-nick"] || "Player", 24) || "Player";
  }

  if (deviceId && bannedIds.has(deviceId)) {
    try {
      ws.close(4003, "Banned device");
    } catch {}
    return;
  }

  ws.deviceId = deviceId;
  ws.playerNick = playerNick;
  ws.roomId = null;
  ws.connectedAt = Date.now();
  relayClients.add(ws);

  ws.on("message", (data, isBinary) => {
    if (ws.deviceId && bannedIds.has(ws.deviceId)) {
      try {
        ws.close(4003, "Banned device");
      } catch {}
      return;
    }

    if (!isBinary) {
      const txt = data.toString("utf8");
      if (txt.startsWith("\t")) {
        const parts = txt.slice(1).split("\t");
        const inLobby = parts[IDX_0] === "1";
        const hasPass = parts[IDX_1] === "1";
        const playersCount = Math.max(1, Number(parts[IDX_2]) || 1);
        const turnNum = Math.max(1, Number(parts[IDX_3]) || 1);
        const rawMap = String(parts[IDX_4] || "0").trim();
        const rawScen = String(parts[IDX_5] || "0").trim();
        const hostName = sanitizeText(parts[IDX_6] || ws.playerNick || "Host", 24);
        const roomKey = ws.deviceId || hostName;
        const resolvedMap = MAP_NAMES[rawMap] || (rawMap && rawMap !== "0" ? rawMap : "Earth");

        ws.roomId = roomKey;
        rooms.set(roomKey, {
          id: roomKey,
          name: hostName + "'s Room",
          host: hostName,
          hostDeviceId: ws.deviceId || "-",
          map: resolvedMap,
          rawScenario: rawScen,
          scenario: resolveScenarioName(rawScen, ws.deviceId, hostName),
          players: playersCount,
          maxPlayers: 8,
          turn: turnNum,
          hasPassword: hasPass,
          inGame: !inLobby,
          updatedAt: Date.now()
        });
      }
    }

    for (const client of relayClients) {
      if (client !== ws && client.readyState === 1) {
        client.send(data, { binary: isBinary });
      }
    }
  });

  ws.on("close", () => {
    relayClients.delete(ws);
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.delete(ws.roomId);
    }
  });

  ws.on("error", () => {
    relayClients.delete(ws);
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.delete(ws.roomId);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms.entries()) {
    if (now - r.updatedAt > 45000) {
      rooms.delete(id);
    }
  }
}, 15000);

server.listen(PORT, () => {
  console.log("AoH2 DE Turgut Multiplayer Server running on port " + PORT);
});
