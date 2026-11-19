const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

try {
  if (fs.existsSync(path.join(__dirname, "keepalive.js"))) {
    require("./keepalive.js");
  }
} catch (_) {}

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = String(process.env.ADMIN_PASS || "tuef7603316");
const MAX_ROOMS = 500;
const JOIN_TIMEOUT_MS = 25000;
const HEARTBEAT_INTERVAL_MS = 12000;
const STALE_SWEEP_MS = 10000;
const DEVICE_OFFLINE_MS = 25000;
const MAX_CHAT_HISTORY = 120;

const IDX_0 = 0;
const IDX_1 = 1;
const IDX_2 = 2;
const IDX_3 = 3;
const IDX_4 = 4;
const IDX_5 = 5;
const IDX_6 = 6;

// Original Relay Stores
const rooms = new Map();
const waiting = new Map();
const games = new Map();
let nextClientId = 1;
const startTime = Date.now();

// Admin, Chat, Device & Custom Editor Scenario Stores
const devices = new Map();
const bannedIds = new Set();
const vipIds = new Set();
const mutedIds = new Set();
const pendingCommands = new Map();
const scenarioRegistry = new Map();

const chatHistory = [
  {
    id: "sys-welcome-001",
    deviceId: "SYSTEM",
    nick: "Turgut Efe",
    text: "Welcome to Age of History II Definitive Edition — Turgut Multiplayer!",
    isAdmin: true,
    isVip: true,
    ts: Date.now()
  }
];

let latestNoticeId = "notice-" + Date.now();
let latestAnnouncement = "Welcome to AoH2 DE Turgut Edition Multiplayer! Create or join a live lobby.";

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

function sanitizeText(input, maxLen) {
  const limit = maxLen || 120;
  return String(input == null ? "" : input)
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function normalizeDeviceId(rawId) {
  const cleaned = sanitizeText(rawId || "", 36).toUpperCase();
  if (!cleaned || cleaned === "NULL" || cleaned === "UNDEFINED") return "";
  return cleaned;
}

function registerScenarioName(rawCode, displayName) {
  const code = sanitizeText(rawCode || "", 64);
  const name = sanitizeText(displayName || "", 80);
  if (!name || name === "-" || name === "0" || name.toLowerCase() === "null") return;
  if (code && code !== "-" && code !== "0") scenarioRegistry.set(code, name);
  scenarioRegistry.set(name.toLowerCase(), name);
}

function resolveScenarioDisplay(rawScen, hostDeviceId, hostNick) {
  const cleanRaw = sanitizeText(rawScen || "", 80);
  if (cleanRaw && cleanRaw !== "-" && cleanRaw !== "0" && cleanRaw.toLowerCase() !== "null") {
    return scenarioRegistry.get(cleanRaw) || DEFAULT_SCENARIOS[cleanRaw] || cleanRaw;
  }

  const normId = normalizeDeviceId(hostDeviceId);
  if (normId && devices.has(normId)) {
    const dev = devices.get(normId);
    if (dev && dev.scenario && dev.scenario !== "-" && dev.scenario !== "0") {
      return scenarioRegistry.get(dev.scenario) || DEFAULT_SCENARIOS[dev.scenario] || dev.scenario;
    }
  }

  if (hostNick) {
    const targetNick = sanitizeText(hostNick, 32).toLowerCase();
    for (const dev of devices.values()) {
      if (dev && dev.nick && dev.nick.trim().toLowerCase() === targetNick) {
        if (dev.scenario && dev.scenario !== "-" && dev.scenario !== "0") {
          return scenarioRegistry.get(dev.scenario) || DEFAULT_SCENARIOS[dev.scenario] || dev.scenario;
        }
      }
    }
  }

  return cleanRaw === "0" ? "Modern World" : (cleanRaw || "Modern World");
}

function getClientFingerprint(req) {
  const fwd = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(fwd)
    ? fwd.at(IDX_0)
    : typeof fwd === "string"
      ? fwd.split(",").at(IDX_0).trim()
      : (req.socket && req.socket.remoteAddress) || "unknown";
  return crypto.createHash("sha256").update(String(rawIp)).digest("hex").slice(0, 16);
}
function newCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function parseInfo(line, hostDeviceId) {
  if (!line || typeof line !== "string") return null;
  const p = line.split("\t");
  if (p.length !== 7 || p.at(IDX_0) !== "I" || p.at(IDX_1) !== "1") return null;

  const passFlag = p.at(IDX_2);
  const playersStr = p.at(IDX_3);
  const turnStr = p.at(IDX_4);

  if ((passFlag !== "0" && passFlag !== "1") || !/^[0-9]{1,3}$/.test(playersStr) || !/^[0-9]{1,6}$/.test(turnStr)) {
    return null;
  }

  const hasPass = passFlag === "1";
  const players = Math.max(1, Number(playersStr) || 1);
  const turn = Math.max(1, Number(turnStr) || 1);
  const rawMap = p.at(IDX_5).replace(/[\x00-\x1f]/g, "").trim().slice(0, 80);
  const hostNick = p.at(IDX_6).replace(/[\x00-\x1f]/g, "").trim().slice(0, 32) || "Kurucu";

  let mapName = "Earth";
  let rawScenPart = rawMap || "0";

  if (rawMap.includes(" - ")) {
    const idx = rawMap.indexOf(" - ");
    mapName = rawMap.slice(0, idx).trim() || "Earth";
    rawScenPart = rawMap.slice(idx + 3).trim() || "0";
  } else if (rawMap.includes("|")) {
    const idx = rawMap.indexOf("|");
    mapName = rawMap.slice(0, idx).trim() || "Earth";
    rawScenPart = rawMap.slice(idx + 1).trim() || "0";
  }

  const resolvedScenario = resolveScenarioDisplay(rawScenPart, hostDeviceId, hostNick);
  const displayRawMap = (mapName + " - " + resolvedScenario).slice(0, 80);

  return {
    raw: `1\t${passFlag}\t${players}\t${turn}\t${displayRawMap}\t${hostNick}`,
    hasPass,
    players,
    turn,
    mapName,
    rawScenario: rawScenPart,
    scenarioName: resolvedScenario,
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

function queueCommand(deviceId, type, payload) {
  const normId = normalizeDeviceId(deviceId);
  if (!normId) return false;
  if (!pendingCommands.has(normId)) {
    pendingCommands.set(normId, []);
  }
  const list = pendingCommands.get(normId);
  list.push({
    id: "cmd-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
    type: sanitizeText(type || "WARN", 24).toUpperCase(),
    payload: sanitizeText(payload || "", 260),
    ts: Date.now()
  });
  return true;
}

function sendJson(res, statusCode, payloadObj) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass, X-Device-Id, X-Player-Nick"
  });
  res.end(JSON.stringify(payloadObj));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    let aborted = false;
    req.on("data", (chunk) => {
      if (aborted) return;
      raw += chunk;
      if (raw.length > 2097152) {
        aborted = true;
        try { req.destroy(); } catch (_) {}
        resolve({});
      }
    });
    req.on("end", () => {
      if (aborted || !raw || !raw.trim()) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch (_) {
        resolve({});
      }
    });
    req.on("error", () => {
      if (!aborted) resolve({});
    });
  });
}

function isAdminAuthorized(req, body) {
  const headerPass = String(req.headers["x-admin-pass"] || "").trim();
  const bodyPass = body && body.password ? String(body.password).trim() : "";
  return headerPass === ADMIN_PASS || bodyPass === ADMIN_PASS;
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass, X-Device-Id, X-Player-Nick"
    });
    return res.end();
  }

  const url = req.url || "/";
  let pathname = url;
  try {
    pathname = new URL(url, "http://" + (req.headers.host || "localhost")).pathname;
  } catch (_) {}

  // 1. Original Game Config Endpoint (Crucial for MP Server List & Relay Handshake)
  if (pathname === "/config" || url.startsWith("/config")) {
    const hostHeader = req.headers.host || "://onrender.com";
    const body = `${hostHeader}:443,TR-EU;\n1.0\n/\n/\n`;
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(body);
    return;
  }

  // 2. Original Lobby & Web Portal Live Rooms Endpoints (/api/lobby and /api/rooms)
  if (pathname === "/api/lobby" || pathname === "/api/rooms" || url.startsWith("/api/lobby")) {
    purgeDeadEntries();

    const lobbies = [];
    const portalRooms = [];
    const uniqueDevices = new Set();
    let totalRoomPlayers = 0;
    let publicRooms = 0;

    for (const [code, roomObj] of rooms.entries()) {
      if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) continue;
      if (roomObj.deviceId) {
        uniqueDevices.add(roomObj.deviceId);
      }

      const g = games.get(code);
      if (g && g.parsed) {
        const finalScen = resolveScenarioDisplay(g.parsed.rawScenario, roomObj.deviceId, g.parsed.hostNick);
        g.parsed.scenarioName = finalScen;

        lobbies.push({
          hostNick: g.parsed.hostNick,
          mapName: g.parsed.mapName,
          scenarioName: finalScen,
          turn: g.parsed.turn,
          players: g.parsed.players,
          hasPass: g.parsed.hasPass
        });

        portalRooms.push({
          id: code,
          name: g.parsed.hostNick + " (" + code + ")",
          host: g.parsed.hostNick,
          hostDeviceId: roomObj.deviceId || "-",
          map: g.parsed.mapName,
          scenario: finalScen,
          players: g.parsed.players,
          maxPlayers: 8,
          turn: g.parsed.turn,
          hasPassword: g.parsed.hasPass,
          inGame: g.parsed.turn > 1
        });

        totalRoomPlayers += g.parsed.players;
        publicRooms++;
      } else {
        totalRoomPlayers += 1;
      }
    }

    const activePlayers = Math.max(totalRoomPlayers, uniqueDevices.size);

    return sendJson(res, 200, {
      ok: true,
      activeRooms: rooms.size,
      publicRooms,
      activePlayers,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      lobbies,
      rooms: portalRooms,
      announcement: latestAnnouncement,
      noticeId: latestNoticeId
    });
  }

  // 3. Health Check Endpoint
  if (pathname === "/health" || pathname === "/ping" || url.startsWith("/health")) {
    purgeDeadEntries();
    return sendJson(res, 200, {
      ok: true,
      status: "ok",
      activeRooms: rooms.size,
      publicRooms: games.size,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000)
    });
  }

  // 4. Game Client Heartbeat, Custom Editor Scenario Sync & Admin Command Delivery
  if (pathname === "/api/game/sync" && req.method === "POST") {
    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId) || ("AOH-" + crypto.randomBytes(3).toString("hex").toUpperCase());
    const nick = sanitizeText(body.nick || "Player", 24) || "Player";
    const screen = sanitizeText(body.screen || "MAIN_MENU", 28).toUpperCase();
    const rawScen = sanitizeText(body.room || body.scenario || body.scenarioName || "-", 80);

    if (rawScen && rawScen !== "-" && rawScen !== "0") {
      registerScenarioName(body.scenarioCode || "", rawScen);
    }

    const prev = devices.get(deviceId) || {};
    const effScen = (rawScen && rawScen !== "-" && rawScen !== "0") ? rawScen : (prev.scenario || "-");

    devices.set(deviceId, {
      deviceId,
      nick,
      screen,
      scenario: effScen,
      isVip: vipIds.has(deviceId),
      isBanned: bannedIds.has(deviceId),
      isMuted: mutedIds.has(deviceId),
      lastSeen: Date.now()
    });

    for (const [code, rObj] of rooms.entries()) {
      if (rObj && (rObj.deviceId === deviceId || (rObj.hostNick && rObj.hostNick.toLowerCase() === nick.toLowerCase()))) {
        rObj.deviceId = deviceId;
        rObj.hostNick = nick;
        const g = games.get(code);
        if (g && g.parsed && effScen && effScen !== "-" && effScen !== "0") {
          g.parsed.rawScenario = effScen;
          g.parsed.scenarioName = resolveScenarioDisplay(effScen, deviceId, nick);
          g.info = `1\t${g.parsed.hasPass ? "1" : "0"}\t${g.parsed.players}\t${g.parsed.turn}\t${g.parsed.mapName} - ${g.parsed.scenarioName}\t${g.parsed.hostNick}`;
        }
      }
    }

    const cmds = pendingCommands.get(deviceId) || [];
    if (cmds.length > 0) pendingCommands.delete(deviceId);

    return sendJson(res, 200, {
      ok: true,
      deviceId,
      noticeId: latestNoticeId,
      announcement: latestAnnouncement,
      isVip: vipIds.has(deviceId),
      isBanned: bannedIds.has(deviceId),
      isMuted: mutedIds.has(deviceId),
      commands: cmds
    });
  }

  // 5. Synchronized Lobby Chat Endpoints
  if (pathname === "/api/chat" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, chat: chatHistory.slice(-50) });
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId) || "WEB-GUEST";
    if (bannedIds.has(deviceId) || mutedIds.has(deviceId)) {
      return sendJson(res, 403, { ok: false, error: "Restricted" });
    }
    const text = sanitizeText(body.text || "", 200);
    if (!text) return sendJson(res, 400, { ok: false });

    const adminFlag = isAdminAuthorized(req, body) || deviceId === "ADMIN";
    chatHistory.push({
      id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
      deviceId,
      nick: adminFlag ? "Turgut Efe" : (sanitizeText(body.nick || "Player", 24) || "Player"),
      text,
      isAdmin: adminFlag,
      isVip: adminFlag || vipIds.has(deviceId),
      ts: Date.now()
    });
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY);
    }
    return sendJson(res, 200, { ok: true, chat: chatHistory.slice(-50) });
  }
  // 6. Admin Full Control State & Device Telemetry
  if (pathname === "/api/admin/state" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!isAdminAuthorized(req, body)) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }

    const now = Date.now();
    const deviceList = [];
    for (const dev of devices.values()) {
      deviceList.push({
        deviceId: dev.deviceId,
        nick: dev.nick,
        screen: dev.screen,
        scenario: resolveScenarioDisplay(dev.scenario, dev.deviceId, dev.nick),
        isVip: vipIds.has(dev.deviceId),
        isBanned: bannedIds.has(dev.deviceId),
        isMuted: mutedIds.has(dev.deviceId),
        online: (now - dev.lastSeen) < DEVICE_OFFLINE_MS,
        lastSeen: dev.lastSeen
      });
    }

    deviceList.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.lastSeen - a.lastSeen;
    });

    return sendJson(res, 200, {
      ok: true,
      devices: deviceList,
      activeRooms: rooms.size,
      announcement: latestAnnouncement,
      noticeId: latestNoticeId
    });
  }

  // 7. Admin Full Control Command Execution (Announce, Warn, Kick, Ban, Unban, VIP, Clear Chat)
  if (pathname === "/api/admin/action" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!isAdminAuthorized(req, body)) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }

    const action = sanitizeText(body.action || "", 32).toUpperCase();
    const targetId = normalizeDeviceId(body.deviceId);
    const message = sanitizeText(body.message || "", 250);

    if (action === "ANNOUNCE" && message) {
      latestAnnouncement = message;
      latestNoticeId = "notice-" + Date.now();
      return sendJson(res, 200, { ok: true, noticeId: latestNoticeId });
    }

    if (action === "WARN" && targetId) {
      const warnMsg = message || "Official warning from Administrator Turgut Efe.";
      queueCommand(targetId, "WARN", warnMsg);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "KICK" && targetId) {
      const kickMsg = message || "You have been kicked by Administrator Turgut Efe.";
      queueCommand(targetId, "KICK", kickMsg);
      for (const [code, rObj] of rooms.entries()) {
        if (rObj && rObj.deviceId === targetId) {
          rooms.delete(code);
          games.delete(code);
          if (rObj.ws && rObj.ws.readyState === 1) {
            try { rObj.ws.close(); } catch (_) {}
          }
        }
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === "BAN" && targetId) {
      bannedIds.add(targetId);
      const banMsg = message || "Your device (" + targetId + ") has been banned by Administrator Turgut Efe.";
      queueCommand(targetId, "BAN", banMsg);
      for (const [code, rObj] of rooms.entries()) {
        if (rObj && rObj.deviceId === targetId) {
          rooms.delete(code);
          games.delete(code);
          if (rObj.ws && rObj.ws.readyState === 1) {
            try { rObj.ws.close(); } catch (_) {}
          }
        }
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === "UNBAN" && targetId) {
      bannedIds.delete(targetId);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "VIP" && targetId) {
      if (vipIds.has(targetId)) {
        vipIds.delete(targetId);
      } else {
        vipIds.add(targetId);
        queueCommand(targetId, "WARN", "Congratulations! Administrator Turgut Efe granted VIP status to your account.");
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === "CLEAR_CHAT") {
      chatHistory.length = 0;
      chatHistory.push({
        id: "sys-clear-" + Date.now(),
        deviceId: "SYSTEM",
        nick: "Turgut Efe",
        text: "Lobby chat was cleared by Administrator Turgut Efe.",
        isAdmin: true,
        isVip: true,
        ts: Date.now()
      });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 400, { ok: false, error: "Invalid action" });
  }

  // 8. Serve Static Modular JS Files (lang.js, portal.js)
  const safeRel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const fileCandidate = path.join(__dirname, safeRel);
  if (
    pathname !== "/" &&
    pathname !== "/index.html" &&
    fileCandidate.startsWith(__dirname) &&
    fileCandidate !== __filename &&
    fs.existsSync(fileCandidate) &&
    fs.statSync(fileCandidate).isFile()
  ) {
    const ext = path.extname(fileCandidate).toLowerCase();
    const mimeTypes = {
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    return fs.createReadStream(fileCandidate).pipe(res);
  }

  // 9. Serve Dynamic Web Portal from web.js
  delete require.cache[require.resolve("./web.js")];
  const webMod = require("./web.js");
  const renderFn = typeof webMod === "function" ? webMod : webMod.renderWebPage;
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(renderFn());
});
const wss = new WebSocketServer({
  server,
  maxPayload: 256 * 1024 * 1024,
  perMessageDeflate: false
});

wss.on("connection", (ws, req) => {
  const headerDevId = normalizeDeviceId(req.headers["x-device-id"] || "");
  const deviceId = headerDevId || getClientFingerprint(req);

  if (headerDevId && bannedIds.has(headerDevId)) {
    try {
      ws.close();
    } catch (_) {}
    return;
  }

  ws.isAlive = true;
  ws.deviceId = deviceId;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  let buffer = Buffer.alloc(0);
  let state = "HANDSHAKE";
  let roomCode = null;
  let infoKey = null;
  let peerWs = null;
  let cleaned = false;

  function sendLine(str) {
    if (ws.readyState === 1) {
      try {
        ws.send(Buffer.from(str + "\n", "utf8"));
      } catch (_) {}
    }
  }

  function cleanup() {
    if (cleaned) return;
    cleaned = true;

    if (roomCode) {
      const current = rooms.get(roomCode);
      if (current && current.ws === ws) {
        rooms.delete(roomCode);
        games.delete(roomCode);
      }
      roomCode = null;
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

  ws.on("message", (data) => {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (state === "PIPE") {
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
      const line = buffer.slice(0, nlIdx).toString("utf8").trim();
      buffer = buffer.slice(nlIdx + 1);

      if (state === "HOST_INFO") {
        if (infoKey && games.has(infoKey)) {
          const entry = games.get(infoKey);
          const parsed = parseInfo(line, deviceId);
          if (parsed) {
            entry.parsed = parsed;
            entry.info = parsed.raw;
            const rItem = rooms.get(infoKey);
            if (rItem) {
              rItem.hostNick = parsed.hostNick;
            }
          }
        }
        continue;
      }
      if (state === "HANDSHAKE") {
        const parts = line.split(" ");
        const cmd = parts.at(IDX_0);

        if (parts.length === 1 && cmd === "H" && rooms.size < MAX_ROOMS) {
          if (bannedIds.has(deviceId)) {
            try {
              ws.close();
            } catch (_) {}
            return;
          }

          for (const [oldCode, oldRoom] of rooms.entries()) {
            if (oldRoom && oldRoom.deviceId === deviceId) {
              rooms.delete(oldCode);
              games.delete(oldCode);
              if (oldRoom.ws && oldRoom.ws.readyState === 1) {
                try {
                  oldRoom.ws.close();
                } catch (_) {}
              }
            }
          }

          roomCode = newCode();
          rooms.set(roomCode, { ws, deviceId, createdAt: Date.now() });
          infoKey = roomCode;
          games.set(infoKey, { type: "O", info: null, parsed: null });
          state = "HOST_INFO";
          sendLine("C " + roomCode);
        } else if (parts.length === 1 && cmd === "L") {
          purgeDeadEntries();
          let out = "";
          for (const [k, v] of games.entries()) {
            if (v && v.info && rooms.has(k)) {
              out += `S\t${v.type}\t${k}\t${v.info}\n`;
            }
          }
          out += ".\n";
          if (ws.readyState === 1) {
            try {
              ws.send(Buffer.from(out, "utf8"));
            } catch (_) {}
          }
          try {
            ws.close();
          } catch (_) {}
          return;
        } else if (parts.length === 2 && cmd === "Q") {
          const code = parts.at(IDX_1);
          const roomObj = rooms.get(code);
          const exists = Boolean(roomObj && roomObj.ws && roomObj.ws.readyState === 1);
          sendLine(exists ? "Y" : "N");
          try {
            ws.close();
          } catch (_) {}
          return;
        } else if (parts.length === 2 && cmd === "J") {
          if (bannedIds.has(deviceId)) {
            try {
              ws.close();
            } catch (_) {}
            return;
          }

          const targetCode = parts.at(IDX_1);
          const roomObj = rooms.get(targetCode);
          if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) {
            try {
              ws.close();
            } catch (_) {}
            return;
          }
          const cid = String(nextClientId++);
          const waitKey = `${targetCode} ${cid}`;
          waiting.set(waitKey, { ws, deviceId });
          state = "WAITING_PIPE";
          try {
            roomObj.ws.send(Buffer.from(`N ${cid}\n`, "utf8"));
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
        } else if (parts.length === 3 && cmd === "D" && rooms.has(parts.at(IDX_1))) {
          const waitKey = `${parts.at(IDX_1)} ${parts.at(IDX_2)}`;
          const waitObj = waiting.get(waitKey);
          waiting.delete(waitKey);
          if (!waitObj || !waitObj.ws || waitObj.ws.readyState !== 1) {
            try {
              ws.close();
            } catch (_) {}
            return;
          }
          peerWs = waitObj.ws;
          waitObj.ws._setPeer(ws);
          state = "PIPE";

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

  ws._setPeer = (target) => {
    peerWs = target;
    state = "PIPE";
    if (buffer.length > 0 && peerWs.readyState === 1) {
      try {
        peerWs.send(buffer);
      } catch (_) {}
      buffer = Buffer.alloc(0);
    }
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
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

wss.on("close", () => {
  clearInterval(heartbeat);
});

server.listen(PORT, () => {
  console.log("AoH2DE Turgut Edition MP Dedicated Relay & Web listening on port " + PORT);
});
