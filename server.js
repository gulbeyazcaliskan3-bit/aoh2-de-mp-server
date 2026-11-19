/**
 * Age of History II: Definitive Edition — Turgut Multiplayer Relay & Control Server
 * Full Game Client Compatibility (/api/rooms, /rooms, /list, /api/servers, /ws)
 * Dynamic Custom & Editor Scenario Resolver + Full Admin Control Core
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 10000;
const ADMIN_PASS = String(process.env.ADMIN_PASS || "tuef7603316");
const SERVER_VERSION = "2.5.1-TURGUT-FULL";
const SERVER_START_TIME = Date.now();

const ROOM_TTL_MS = 45000;
const DEVICE_OFFLINE_MS = 25000;
const MAX_CHAT_HISTORY = 120;
const MAX_AUDIT_LOGS = 200;
const MAX_PAYLOAD_BYTES = 2097152;
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_REQ = 120;

const IDX_0 = 0;
const IDX_1 = 1;
const IDX_2 = 2;
const IDX_3 = 3;
const IDX_4 = 4;
const IDX_5 = 5;
const IDX_6 = 6;
const IDX_7 = 7;

const devices = new Map();
const bannedIds = new Set();
const vipIds = new Set();
const mutedIds = new Set();
const pendingCommands = new Map();
const rooms = new Map();
const scenarioRegistry = new Map();
const rateLimitMap = new Map();
const relayClients = new Set();

const serverMetrics = {
  totalHttpRequests: 0,
  totalWsConnections: 0,
  totalWsMessagesRelayed: 0,
  totalBytesRelayed: 0,
  totalRoomsCreated: 0,
  totalChatMessages: 0,
  blockedRequests: 0
};

const auditLogs = [];

const chatHistory = [
  {
    id: "sys-welcome-001",
    deviceId: "SYSTEM",
    nick: "Turgut Efe",
    text: "Welcome to Age of History II Definitive Edition — Turgut Multiplayer Server!",
    isAdmin: true,
    isVip: true,
    ts: Date.now()
  }
];

let latestNoticeId = "notice-" + Date.now();
let latestAnnouncement = "Welcome to AoH2 DE Turgut Edition Multiplayer! Create or join a live lobby.";

const DEFAULT_MAP_NAMES = {
  "0": "Earth",
  "1": "Kepler-22b",
  "2": "Europe",
  "3": "Asia",
  "4": "America",
  "5": "Mediterranean"
};

const DEFAULT_SCENARIO_NAMES = {
  "0": "Modern World",
  "1": "1440",
  "2": "World War II",
  "3": "1200",
  "4": "Victorian Era",
  "5": "5",
  "6": "1440 - Alternate",
  "7": "World War I",
  "8": "Napoleonic Wars",
  "9": "Cold War"
};

function recordAudit(actor, action, target, detail) {
  auditLogs.unshift({
    id: "aud-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
    actor: String(actor || "SYSTEM"),
    action: String(action || "INFO"),
    target: String(target || "-"),
    detail: String(detail || ""),
    ts: Date.now()
  });
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.length = MAX_AUDIT_LOGS;
  }
}

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
  if (!cleaned || cleaned === "NULL" || cleaned === "UNDEFINED") {
    return "";
  }
  return cleaned;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim().length > 0) {
    return fwd.split(",")[IDX_0].trim();
  }
  return (req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : "0.0.0.0";
}

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 1 };
    rateLimitMap.set(ip, entry);
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQ) {
    serverMetrics.blockedRequests += 1;
    return true;
  }
  return false;
}

function registerScenarioName(rawCode, displayName) {
  const code = sanitizeText(rawCode || "", 64);
  const name = sanitizeText(displayName || "", 80);
  if (!name || name === "-" || name === "0" || name.toLowerCase() === "null") {
    return;
  }
  if (code && code !== "-" && code !== "0") {
    scenarioRegistry.set(code, name);
  }
  scenarioRegistry.set(name.toLowerCase(), name);
}

function resolveMapName(rawMap) {
  const clean = sanitizeText(rawMap || "", 48);
  if (!clean || clean === "-" || clean === "null" || clean === "undefined") {
    return "Earth";
  }
  if (DEFAULT_MAP_NAMES[clean]) {
    return DEFAULT_MAP_NAMES[clean];
  }
  return clean;
}

function resolveScenarioName(rawScen, hostDeviceId, hostNick) {
  const cleanRaw = sanitizeText(rawScen || "", 80);

  if (cleanRaw && cleanRaw !== "-" && cleanRaw !== "0" && cleanRaw.toLowerCase() !== "null") {
    if (scenarioRegistry.has(cleanRaw)) {
      return scenarioRegistry.get(cleanRaw);
    }
    if (DEFAULT_SCENARIO_NAMES[cleanRaw]) {
      return DEFAULT_SCENARIO_NAMES[cleanRaw];
    }
    return cleanRaw;
  }

  const normId = normalizeDeviceId(hostDeviceId);
  if (normId && devices.has(normId)) {
    const dev = devices.get(normId);
    if (dev && dev.scenario && dev.scenario !== "-" && dev.scenario !== "0") {
      return scenarioRegistry.get(dev.scenario) || DEFAULT_SCENARIO_NAMES[dev.scenario] || dev.scenario;
    }
  }

  if (hostNick) {
    const targetNick = sanitizeText(hostNick, 32).toLowerCase();
    for (const dev of devices.values()) {
      if (dev && dev.nick && dev.nick.trim().toLowerCase() === targetNick) {
        if (dev.scenario && dev.scenario !== "-" && dev.scenario !== "0") {
          return scenarioRegistry.get(dev.scenario) || DEFAULT_SCENARIO_NAMES[dev.scenario] || dev.scenario;
        }
      }
    }
  }

  if (cleanRaw === "0") {
    return DEFAULT_SCENARIO_NAMES["0"];
  }
  return "Custom Scenario";
}

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
  if (list.length > 25) {
    list.splice(0, list.length - 25);
  }
  return true;
}

function removeRoomsByHost(deviceId, hostNick) {
  const normId = normalizeDeviceId(deviceId);
  const normNick = sanitizeText(hostNick || "", 32).toLowerCase();
  let removed = 0;

  for (const [roomId, room] of rooms.entries()) {
    const matchId = normId && room.hostDeviceId === normId;
    const matchNick = normNick && room.host && room.host.toLowerCase() === normNick;
    if (matchId || matchNick) {
      rooms.delete(roomId);
      removed += 1;
    }
  }
  return removed;
}

function sendJson(res, statusCode, payloadObj) {
  const jsonText = JSON.stringify(payloadObj);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Server-Version": SERVER_VERSION,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass, X-Device-Id, X-Player-Nick"
  });
  res.end(jsonText);
}

function sendText(res, statusCode, text, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(String(text || ""));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    let aborted = false;

    req.on("data", (chunk) => {
      if (aborted) return;
      raw += chunk;
      if (raw.length > MAX_PAYLOAD_BYTES) {
        aborted = true;
        serverMetrics.blockedRequests += 1;
        try {
          req.destroy();
        } catch {}
        resolve({});
      }
    });

    req.on("end", () => {
      if (aborted) return;
      if (!raw || !raw.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
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
  serverMetrics.totalHttpRequests += 1;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass, X-Device-Id, X-Player-Nick",
      "Access-Control-Max-Age": "86400"
    });
    return res.end();
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return sendJson(res, 429, {
      ok: false,
      error: "Too many requests. Please slow down."
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Malformed request URL" });
  }

  const pathname = parsedUrl.pathname;

  if (pathname === "/health" || pathname === "/ping") {
    return sendJson(res, 200, {
      ok: true,
      status: "running",
      version: SERVER_VERSION,
      uptimeSec: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      activeRooms: rooms.size,
      connectedSockets: relayClients.size,
      ts: Date.now()
    });
  }

  if (pathname === "/api/status" && req.method === "GET") {
    const now = Date.now();
    let onlinePlayers = 0;
    for (const dev of devices.values()) {
      if ((now - dev.lastSeen) < DEVICE_OFFLINE_MS) {
        onlinePlayers += 1;
      }
    }
    return sendJson(res, 200, {
      ok: true,
      version: SERVER_VERSION,
      onlinePlayers,
      activeRooms: rooms.size,
      wsClients: relayClients.size,
      announcement: latestAnnouncement,
      noticeId: latestNoticeId,
      uptimeSec: Math.floor((now - SERVER_START_TIME) / 1000)
    });
  }

  if (pathname === "/api/game/sync" && req.method === "POST") {
    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId) || ("AOH-" + crypto.randomBytes(3).toString("hex").toUpperCase());
    const nick = sanitizeText(body.nick || "Player", 24) || "Player";
    const screen = sanitizeText(body.screen || "MAIN_MENU", 28).toUpperCase();
    const rawScenInput = sanitizeText(body.room || body.scenario || body.scenarioName || "-", 80);
    const rawScenCode = sanitizeText(body.scenarioCode || "", 64);

    if (rawScenInput && rawScenInput !== "-" && rawScenInput !== "0") {
      registerScenarioName(rawScenCode, rawScenInput);
    }

    const prevDevice = devices.get(deviceId) || {};
    const effectiveScenario = (rawScenInput && rawScenInput !== "-" && rawScenInput !== "0")
      ? rawScenInput
      : (prevDevice.scenario || "-");

    const now = Date.now();
    const isBanned = bannedIds.has(deviceId);
    const isVip = vipIds.has(deviceId);
    const isMuted = mutedIds.has(deviceId);

    const updatedDevice = {
      deviceId,
      nick,
      screen,
      scenario: effectiveScenario,
      ip: clientIp,
      isVip,
      isBanned,
      isMuted,
      banNotified: Boolean(prevDevice.banNotified),
      firstSeen: prevDevice.firstSeen || now,
      lastSeen: now
    };
    devices.set(deviceId, updatedDevice);

    for (const room of rooms.values()) {
      const sameId = room.hostDeviceId && room.hostDeviceId === deviceId;
      const sameNick = room.host && room.host.trim().toLowerCase() === nick.trim().toLowerCase();
      if (sameId || sameNick) {
        room.hostDeviceId = deviceId;
        room.host = nick;
        if (effectiveScenario && effectiveScenario !== "-" && effectiveScenario !== "0") {
          room.rawScenario = effectiveScenario;
        }
        room.scenario = resolveScenarioName(room.rawScenario, deviceId, nick);
        room.updatedAt = now;
      }
    }

    const queued = pendingCommands.get(deviceId) || [];
    if (queued.length > 0) {
      pendingCommands.delete(deviceId);
    }

    if (isBanned && !updatedDevice.banNotified) {
      updatedDevice.banNotified = true;
      queued.push({
        id: "ban-" + now,
        type: "BAN",
        payload: "Your device (" + deviceId + ") has been banned by Administrator Turgut Efe.",
        ts: now
      });
    }

    return sendJson(res, 200, {
      ok: true,
      deviceId,
      noticeId: latestNoticeId,
      announcement: latestAnnouncement,
      isVip,
      isBanned,
      isMuted,
      commands: queued
    });
  }

  // Full Game Client & Web Room Listing Compatibility
  if (
    (pathname === "/api/rooms" || pathname === "/rooms" || pathname === "/list" || pathname === "/api/servers") &&
    req.method === "GET"
  ) {
    const now = Date.now();
    const activeList = [];

    for (const [roomId, room] of rooms.entries()) {
      if ((now - room.updatedAt) > ROOM_TTL_MS) {
        rooms.delete(roomId);
        continue;
      }

      const resolvedScenario = resolveScenarioName(room.rawScenario, room.hostDeviceId, room.host);
      room.scenario = resolvedScenario;

      activeList.push({
        id: room.id,
        name: room.name,
        host: room.host,
        hostDeviceId: room.hostDeviceId || "-",
        map: resolveMapName(room.map),
        scenario: resolvedScenario,
        players: Math.max(1, Number(room.players) || 1),
        maxPlayers: Math.max(2, Number(room.maxPlayers) || 8),
        turn: Math.max(1, Number(room.turn) || 1),
        hasPassword: Boolean(room.hasPassword),
        inGame: Boolean(room.inGame),
        updatedAt: room.updatedAt
      });
    }

    activeList.sort((a, b) => b.updatedAt - a.updatedAt);

    return sendJson(res, 200, {
      ok: true,
      rooms: activeList,
      servers: activeList,
      announcement: latestAnnouncement,
      noticeId: latestNoticeId,
      serverTime: now
    });
  }

  if (
    (pathname === "/api/rooms/register" || pathname === "/rooms/register" || pathname === "/register") &&
    req.method === "POST"
  ) {
    const body = await readJsonBody(req);
    const hostDeviceId = normalizeDeviceId(body.hostDeviceId || body.deviceId);

    if (hostDeviceId && bannedIds.has(hostDeviceId)) {
      return sendJson(res, 403, {
        ok: false,
        error: "This device is permanently banned from hosting rooms."
      });
    }

    const hostNick = sanitizeText(body.host || body.nick || "Host", 24) || "Host";
    const roomId = sanitizeText(body.id || hostDeviceId || crypto.randomUUID(), 48);
    const roomName = sanitizeText(body.name || (hostNick + "'s Room"), 44) || (hostNick + "'s Room");
    const rawMap = sanitizeText(body.map || "Earth", 40);
    const rawScen = sanitizeText(body.scenario || body.scenarioName || "0", 80);

    if (rawScen && rawScen !== "-" && rawScen !== "0") {
      registerScenarioName(body.scenarioCode || "", rawScen);
    }

    const isNewRoom = !rooms.has(roomId);
    const resolvedScen = resolveScenarioName(rawScen, hostDeviceId, hostNick);

    rooms.set(roomId, {
      id: roomId,
      name: roomName,
      host: hostNick,
      hostDeviceId: hostDeviceId || "-",
      map: resolveMapName(rawMap),
      rawScenario: rawScen,
      scenario: resolvedScen,
      players: Math.max(1, Math.min(32, Number(body.players) || 1)),
      maxPlayers: Math.max(2, Math.min(32, Number(body.maxPlayers) || 8)),
      turn: Math.max(1, Number(body.turn) || 1),
      hasPassword: Boolean(body.hasPassword),
      inGame: Boolean(body.inGame),
      createdAt: isNewRoom ? Date.now() : (rooms.get(roomId).createdAt || Date.now()),
      updatedAt: Date.now()
    });

    if (isNewRoom) {
      serverMetrics.totalRoomsCreated += 1;
      recordAudit(hostDeviceId || hostNick, "ROOM_CREATED", roomId, roomName + " [" + resolvedScen + "]");
    }

    return sendJson(res, 200, {
      ok: true,
      roomId,
      scenario: resolvedScen
    });
  }

  if (pathname === "/api/rooms/close" && req.method === "POST") {
    const body = await readJsonBody(req);
    const roomId = sanitizeText(body.roomId || body.id || "", 48);
    const hostDeviceId = normalizeDeviceId(body.hostDeviceId || body.deviceId);

    let closedCount = 0;
    if (roomId && rooms.has(roomId)) {
      rooms.delete(roomId);
      closedCount += 1;
    }
    if (hostDeviceId) {
      closedCount += removeRoomsByHost(hostDeviceId, "");
    }

    return sendJson(res, 200, { ok: true, closed: closedCount });
  }

  if (pathname === "/api/chat" && req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      chat: chatHistory.slice(-50)
    });
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId) || "WEB-GUEST";

    if (bannedIds.has(deviceId)) {
      return sendJson(res, 403, {
        ok: false,
        error: "Your device is banned from sending messages."
      });
    }

    if (mutedIds.has(deviceId)) {
      return sendJson(res, 403, {
        ok: false,
        error: "Your device is temporarily muted by an Administrator."
      });
    }

    const cleanMsg = sanitizeText(body.text || "", 200);
    if (!cleanMsg) {
      return sendJson(res, 400, { ok: false, error: "Message text cannot be empty." });
    }

    const isAdmin = isAdminAuthorized(req, body) || deviceId === "ADMIN";
    const senderNick = isAdmin
      ? "Turgut Efe"
      : (sanitizeText(body.nick || "Player", 24) || "Player");

    const entry = {
      id: "msg-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
      deviceId,
      nick: senderNick,
      text: cleanMsg,
      isAdmin,
      isVip: isAdmin || vipIds.has(deviceId),
      ts: Date.now()
    };

    chatHistory.push(entry);
    serverMetrics.totalChatMessages += 1;

    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY);
    }

    return sendJson(res, 200, {
      ok: true,
      message: entry,
      chat: chatHistory.slice(-50)
    });
  }
  if (pathname === "/api/admin/state" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!isAdminAuthorized(req, body)) {
      serverMetrics.blockedRequests += 1;
      return sendJson(res, 401, { ok: false, error: "Unauthorized admin credentials." });
    }

    const now = Date.now();
    const deviceList = [];

    for (const dev of devices.values()) {
      const resolvedScen = resolveScenarioName(dev.scenario, dev.deviceId, dev.nick);
      deviceList.push({
        deviceId: dev.deviceId,
        nick: dev.nick,
        screen: dev.screen,
        scenario: resolvedScen,
        ip: dev.ip || "-",
        isVip: vipIds.has(dev.deviceId),
        isBanned: bannedIds.has(dev.deviceId),
        isMuted: mutedIds.has(dev.deviceId),
        online: (now - dev.lastSeen) < DEVICE_OFFLINE_MS,
        lastSeen: dev.lastSeen,
        firstSeen: dev.firstSeen || dev.lastSeen
      });
    }

    deviceList.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.lastSeen - a.lastSeen;
    });

    const roomList = [];
    for (const room of rooms.values()) {
      roomList.push({
        ...room,
        scenario: resolveScenarioName(room.rawScenario, room.hostDeviceId, room.host)
      });
    }

    return sendJson(res, 200, {
      ok: true,
      version: SERVER_VERSION,
      uptimeSec: Math.floor((now - SERVER_START_TIME) / 1000),
      metrics: serverMetrics,
      devices: deviceList,
      rooms: roomList,
      bannedIds: Array.from(bannedIds),
      vipIds: Array.from(vipIds),
      mutedIds: Array.from(mutedIds),
      announcement: latestAnnouncement,
      noticeId: latestNoticeId,
      chat: chatHistory.slice(-50),
      auditLogs: auditLogs.slice(0, 50)
    });
  }

  if (pathname === "/api/admin/action" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!isAdminAuthorized(req, body)) {
      serverMetrics.blockedRequests += 1;
      return sendJson(res, 401, { ok: false, error: "Unauthorized admin credentials." });
    }

    const action = sanitizeText(body.action || "", 32).toUpperCase();
    const targetId = normalizeDeviceId(body.deviceId);
    const message = sanitizeText(body.message || "", 250);

    if (action === "ANNOUNCE") {
      if (!message) {
        return sendJson(res, 400, { ok: false, error: "Announcement text is required." });
      }
      latestAnnouncement = message;
      latestNoticeId = "notice-" + Date.now();
      recordAudit("ADMIN", "ANNOUNCE", "ALL", message);
      return sendJson(res, 200, { ok: true, noticeId: latestNoticeId });
    }

    if (action === "BROADCAST_WARN") {
      if (!message) {
        return sendJson(res, 400, { ok: false, error: "Broadcast warning message is required." });
      }
      let sentCount = 0;
      const now = Date.now();
      for (const dev of devices.values()) {
        if ((now - dev.lastSeen) < DEVICE_OFFLINE_MS * 3) {
          queueCommand(dev.deviceId, "WARN", message);
          sentCount += 1;
        }
      }
      recordAudit("ADMIN", "BROADCAST_WARN", sentCount + " devices", message);
      return sendJson(res, 200, { ok: true, delivered: sentCount });
    }

    if (action === "WARN") {
      if (!targetId) {
        return sendJson(res, 400, { ok: false, error: "Target device ID is required." });
      }
      const warnMsg = message || "You have received an official warning from Administrator Turgut Efe.";
      queueCommand(targetId, "WARN", warnMsg);
      recordAudit("ADMIN", "WARN", targetId, warnMsg);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "KICK") {
      if (!targetId) {
        return sendJson(res, 400, { ok: false, error: "Target device ID is required." });
      }
      const kickMsg = message || "You have been removed from the multiplayer session by Administrator Turgut Efe.";
      queueCommand(targetId, "KICK", kickMsg);
      const closedRooms = removeRoomsByHost(targetId, "");
      for (const client of relayClients) {
        if (client.deviceId === targetId) {
          try {
            client.close(4001, "Kicked by Administrator");
          } catch {}
        }
      }
      recordAudit("ADMIN", "KICK", targetId, kickMsg + " (Rooms closed: " + closedRooms + ")");
      return sendJson(res, 200, { ok: true, closedRooms });
    }

    if (action === "BAN") {
      if (!targetId) {
        return sendJson(res, 400, { ok: false, error: "Target device ID is required." });
      }
      bannedIds.add(targetId);
      if (devices.has(targetId)) {
        devices.get(targetId).isBanned = true;
        devices.get(targetId).banNotified = true;
      }
      const banMsg = message || "Your device (" + targetId + ") has been permanently banned by Administrator Turgut Efe.";
      queueCommand(targetId, "BAN", banMsg);
      const closedRooms = removeRoomsByHost(targetId, "");
      for (const client of relayClients) {
        if (client.deviceId === targetId) {
          try {
            client.close(4003, "Banned by Administrator");
          } catch {}
        }
      }
      recordAudit("ADMIN", "BAN", targetId, banMsg + " (Rooms closed: " + closedRooms + ")");
      return sendJson(res, 200, { ok: true, closedRooms });
    }

    if (action === "UNBAN") {
      if (!targetId) {
        return sendJson(res, 400, { ok: false, error: "Target device ID is required." });
      }
      bannedIds.delete(targetId);
      if (devices.has(targetId)) {
        devices.get(targetId).isBanned = false;
        devices.get(targetId).banNotified = false;
      }
      recordAudit("ADMIN", "UNBAN", targetId, "Device ban lifted");
      return sendJson(res, 200, { ok: true });
    }

    if (action === "MUTE") {
      if (!targetId) {
        return sendJson(res, 400, { ok: false, error: "Target device ID is required." });
      }
      if (mutedIds.has(targetId)) {
        mutedIds.delete(targetId);
        recordAudit("ADMIN", "UNMUTE", targetId, "Chat mute lifted");
      } else {
        mutedIds.add(targetId);
        recordAudit("ADMIN", "MUTE", targetId, "Device muted in lobby chat");
      }
      return sendJson(res, 200, { ok: true, isMuted: mutedIds.has(targetId) });
    }

    if (action === "VIP") {
      if (!targetId) {
        return sendJson(res, 400, { ok: false, error: "Target device ID is required." });
      }
      if (vipIds.has(targetId)) {
        vipIds.delete(targetId);
        recordAudit("ADMIN", "VIP_REMOVED", targetId, "VIP status revoked");
      } else {
        vipIds.add(targetId);
        queueCommand(targetId, "WARN", "Congratulations! Administrator Turgut Efe has granted VIP Supporter status to your account.");
        recordAudit("ADMIN", "VIP_GRANTED", targetId, "VIP status granted");
      }
      return sendJson(res, 200, { ok: true, isVip: vipIds.has(targetId) });
    }

    if (action === "CLOSE_ROOM") {
      const targetRoomId = sanitizeText(body.roomId || "", 48);
      if (!targetRoomId || !rooms.has(targetRoomId)) {
        return sendJson(res, 404, { ok: false, error: "Room not found." });
      }
      const roomObj = rooms.get(targetRoomId);
      rooms.delete(targetRoomId);
      recordAudit("ADMIN", "CLOSE_ROOM", targetRoomId, "Closed room: " + (roomObj.name || targetRoomId));
      return sendJson(res, 200, { ok: true });
    }

    if (action === "REGISTER_SCENARIO") {
      const code = sanitizeText(body.code || "", 64);
      const name = sanitizeText(body.name || message, 80);
      if (!name) {
        return sendJson(res, 400, { ok: false, error: "Scenario name is required." });
      }
      registerScenarioName(code, name);
      recordAudit("ADMIN", "REGISTER_SCENARIO", code || "CUSTOM", name);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "CLEAR_CHAT") {
      chatHistory.length = 0;
      chatHistory.push({
        id: "sys-clear-" + Date.now(),
        deviceId: "SYSTEM",
        nick: "Turgut Efe",
        text: "Lobby chat history was cleared by Administrator Turgut Efe.",
        isAdmin: true,
        isVip: true,
        ts: Date.now()
      });
      recordAudit("ADMIN", "CLEAR_CHAT", "CHAT", "Cleared lobby chat history");
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 400, { ok: false, error: "Unknown admin action: " + action });
  }
  // Serve Dynamic Web Portal from web.js Module
  if ((pathname === "/" || pathname === "/index.html") && fs.existsSync(path.join(__dirname, "web.js"))) {
    try {
      delete require.cache[require.resolve("./web.js")];
      const renderWeb = require("./web.js");
      const htmlOutput = typeof renderWeb === "function" ? renderWeb() : String(renderWeb);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      });
      return res.end(htmlOutput);
    } catch (err) {
      return sendText(res, 500, "Web Module Error: " + (err && err.message ? err.message : "Unknown error"));
    }
  }

  // Safe Static File Server for lang.js, portal.js and Assets
  const safeRelative = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidatePath = path.join(__dirname, safeRelative);
  if (
    candidatePath.startsWith(__dirname) &&
    candidatePath !== __filename &&
    fs.existsSync(candidatePath) &&
    fs.statSync(candidatePath).isFile()
  ) {
    const ext = path.extname(candidatePath).toLowerCase();
    const mimeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    };
    res.writeHead(200, {
      "Content-Type": mimeMap[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    return fs.createReadStream(candidatePath).pipe(res);
  }

  return sendJson(res, 404, {
    ok: false,
    error: "Endpoint not found",
    path: pathname
  });
});

// High-Performance Low-Latency WebSocket Multiplayer Relay Server
const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  maxPayload: 16 * 1024 * 1024
});

wss.on("connection", (ws, req) => {
  serverMetrics.totalWsConnections += 1;

  const rawDevId = req.headers["x-device-id"] || "";
  const deviceId = normalizeDeviceId(rawDevId);

  let playerNick = "Player";
  try {
    const rawNickHeader = req.headers["x-player-nick"] || "Player";
    playerNick = sanitizeText(decodeURIComponent(rawNickHeader), 24) || "Player";
  } catch {
    playerNick = sanitizeText(req.headers["x-player-nick"] || "Player", 24) || "Player";
  }

  if (deviceId && bannedIds.has(deviceId)) {
    recordAudit("RELAY_GUARD", "BLOCKED_WS_CONNECT", deviceId, "Rejected banned device: " + playerNick);
    try {
      ws.close(4003, "Device permanently banned");
    } catch {}
    return;
  }

  ws.id = crypto.randomUUID();
  ws.deviceId = deviceId;
  ws.playerNick = playerNick;
  ws.roomId = null;
  ws.isAlive = true;
  ws.connectedAt = Date.now();
  ws.ip = getClientIp(req);

  relayClients.add(ws);

  if (deviceId) {
    const existing = devices.get(deviceId) || {};
    devices.set(deviceId, {
      deviceId,
      nick: playerNick,
      screen: existing.screen || "MP_LOBBY",
      scenario: existing.scenario || "-",
      ip: ws.ip,
      isVip: vipIds.has(deviceId),
      isBanned: false,
      isMuted: mutedIds.has(deviceId),
      banNotified: false,
      firstSeen: existing.firstSeen || Date.now(),
      lastSeen: Date.now()
    });
  }

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (data, isBinary) => {
    if (ws.deviceId && bannedIds.has(ws.deviceId)) {
      try {
        ws.close(4003, "Device permanently banned");
      } catch {}
      return;
    }

    const byteSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(String(data));
    serverMetrics.totalWsMessagesRelayed += 1;
    serverMetrics.totalBytesRelayed += byteSize;

    // Parse Room Listing Broadcasts (\t-prefixed control frames from AoH2 DE MP Host)
    if (!isBinary) {
      const textFrame = data.toString("utf8");
      if (textFrame.startsWith("\t")) {
        const parts = textFrame.slice(1).split("\t");
        const inLobby = parts[IDX_0] === "1";
        const hasPass = parts[IDX_1] === "1";
        const playersCount = Math.max(1, Math.min(32, Number(parts[IDX_2]) || 1));
        const turnNum = Math.max(1, Number(parts[IDX_3]) || 1);
        const rawMap = sanitizeText(parts[IDX_4] || "0", 40);
        const rawScen = sanitizeText(parts[IDX_5] || "0", 80);
        const hostName = sanitizeText(parts[IDX_6] || ws.playerNick || "Host", 24) || "Host";
        const customRoomTitle = parts.length > IDX_7 ? sanitizeText(parts[IDX_7], 44) : "";

        const roomKey = ws.deviceId || ("HOST-" + hostName.toUpperCase());
        const resolvedMap = resolveMapName(rawMap);
        const resolvedScenario = resolveScenarioName(rawScen, ws.deviceId, hostName);
        const isNewListing = !rooms.has(roomKey);

        ws.roomId = roomKey;
        rooms.set(roomKey, {
          id: roomKey,
          name: customRoomTitle || (hostName + "'s Room"),
          host: hostName,
          hostDeviceId: ws.deviceId || "-",
          map: resolvedMap,
          rawScenario: rawScen,
          scenario: resolvedScenario,
          players: playersCount,
          maxPlayers: 8,
          turn: turnNum,
          hasPassword: hasPass,
          inGame: !inLobby,
          createdAt: isNewListing ? Date.now() : (rooms.get(roomKey).createdAt || Date.now()),
          updatedAt: Date.now()
        });

        if (isNewListing) {
          serverMetrics.totalRoomsCreated += 1;
          recordAudit(ws.deviceId || hostName, "WS_ROOM_LISTED", roomKey, resolvedMap + " / " + resolvedScenario);
        }
      }
    }

    for (const peer of relayClients) {
      if (peer !== ws && peer.readyState === 1) {
        try {
          peer.send(data, { binary: isBinary });
        } catch {}
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

const wsHeartbeatInterval = setInterval(() => {
  for (const ws of relayClients) {
    if (ws.isAlive === false) {
      relayClients.delete(ws);
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.delete(ws.roomId);
      }
      try {
        ws.terminate();
      } catch {}
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {}
  }
}, 25000);

const maintenanceInterval = setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    if ((now - room.updatedAt) > ROOM_TTL_MS) {
      rooms.delete(roomId);
    }
  }

  for (const [ip, entry] of rateLimitMap.entries()) {
    if ((now - entry.windowStart) > RATE_LIMIT_WINDOW_MS * 3) {
      rateLimitMap.delete(ip);
    }
  }
}, 15000);

function gracefulShutdown(signal) {
  console.log("[SHUTDOWN] Received " + signal + ", closing server gracefully...");
  clearInterval(wsHeartbeatInterval);
  clearInterval(maintenanceInterval);

  for (const ws of relayClients) {
    try {
      ws.close(1001, "Server restarting");
    } catch {}
  }

  server.close(() => {
    console.log("[SHUTDOWN] HTTP and WebSocket servers closed cleanly.");
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 4000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server.listen(PORT, "0.0.0.0", () => {
  console.log("==========================================================");
  console.log(" AoH2 Definitive Edition — Turgut Multiplayer Server");
  console.log(" Version : " + SERVER_VERSION);
  console.log(" Port    : " + PORT);
  console.log(" Status  : ONLINE & READY");
  console.log("==========================================================");
  recordAudit("SYSTEM", "SERVER_BOOT", "PORT_" + PORT, "Server started successfully (" + SERVER_VERSION + ")");
});
