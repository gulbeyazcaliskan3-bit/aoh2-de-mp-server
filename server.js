const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const db = require("./db");

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = String(process.env.ADMIN_PASS || "").trim();
const SESSION_SECRET = crypto.randomBytes(32);
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_ROOMS = 500;
const JOIN_TIMEOUT_MS = 25000;
const HEARTBEAT_INTERVAL_MS = 12000;
const STALE_SWEEP_MS = 10000;
const DEVICE_OFFLINE_MS = 25000;
const MAX_CHAT_HISTORY = 120;
const CHAT_COOLDOWN_MS = 1500;

let renderWebFn = null;
try {
  const webMod = require("./web.js");
  renderWebFn = typeof webMod === "function" ? webMod : webMod.renderWebPage;
} catch (err) {
  console.error("[WEB] web.js yuklenemedi:", err.message);
}

try {
  const ka = require("./keepalive.js");
  if (ka && typeof ka.startKeepAlive === "function") {
    ka.startKeepAlive();
  }
} catch (_) {}

if (!ADMIN_PASS) {
  console.warn("[AUTH WARN] ADMIN_PASS env tanimli degil! Admin girisi devre disi.");
}

const rooms = new Map();
const waiting = new Map();
const games = new Map();
let nextClientId = 1;
const startTime = Date.now();

let devices = new Map();
let bannedIds = new Set();
let vipIds = new Set();
let mutedIds = new Set();
let pendingCommands = new Map();
let scenarioRegistry = new Map();
let chatHistory = [];
const lastChatTs = new Map();

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
  return String(input == null ? "" : input)
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen || 120);
}

function normalizeDeviceId(rawId) {
  const cleaned = sanitizeText(rawId || "", 36).toUpperCase().replace(/[^A-Z0-9\-]/g, "");
  if (!cleaned || cleaned === "NULL" || cleaned === "UNDEFINED") return "";
  return cleaned;
}

function registerScenarioName(rawCode, displayName) {
  const code = sanitizeText(rawCode || "", 64);
  const name = sanitizeText(displayName || "", 80);
  if (!name || name === "-" || name === "0" || name.toLowerCase() === "null") return;
  if (code && code !== "-" && code !== "0" && scenarioRegistry.get(code) !== name) {
    scenarioRegistry.set(code, name);
    db.saveScenario(code, name).catch(() => {});
  }
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
  return "Custom / Unknown";
}

function getClientIpHash(req) {
  const fwd = req && req.headers ? req.headers["x-forwarded-for"] : null;
  const rawIp = Array.isArray(fwd)
    ? fwd[0]
    : typeof fwd === "string"
      ? fwd.split(",")[0].trim()
      : (req && req.socket && req.socket.remoteAddress) || "unknown";
  return crypto.createHash("sha256").update(String(rawIp)).digest("hex").slice(0, 16);
}

function newCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(crypto.randomInt(0, chars.length));
  } while (rooms.has(code));
  return code;
}

function parseInfo(line, hostDeviceId) {
  if (!line || typeof line !== "string") return null;
  const p = line.split("\t");
  if (p.length !== 7 || p[0] !== "I" || p[1] !== "1") return null;

  const passFlag = p[2];
  const playersStr = p[3];
  const turnStr = p[4];
  if ((passFlag !== "0" && passFlag !== "1") || !/^[0-9]{1,3}$/.test(playersStr) || !/^[0-9]{1,6}$/.test(turnStr)) {
    return null;
  }

  const hasPass = passFlag === "1";
  const players = Math.max(1, Number(playersStr) || 1);
  const turn = Math.max(0, Number(turnStr) || 0);
  const rawMapField = p[5].replace(/[\x00-\x1f]/g, "").trim().slice(0, 100);
  const hostNick = p[6].replace(/[\x00-\u001f]/g, "").trim().slice(0, 32) || "Host";

  let mapIdOrName = "0";
  let mapName = "Earth";
  let rawScenPart = "-";

  if (rawMapField.includes("|")) {
    const parts = rawMapField.split("|");
    if (parts.length >= 3) {
      mapIdOrName = parts[0].trim() || "0";
      mapName = parts[1].trim() || "Earth";
      rawScenPart = parts.slice(2).join("|").trim() || "-";
    } else {
      mapName = parts[0].trim() || "Earth";
      rawScenPart = parts[1].trim() || "-";
    }
  } else if (rawMapField.includes(" - ")) {
    const idx = rawMapField.indexOf(" - ");
    mapName = rawMapField.slice(0, idx).trim() || "Earth";
    rawScenPart = rawMapField.slice(idx + 3).trim() || "-";
  } else if (/^\d+$/.test(rawMapField)) {
    mapIdOrName = rawMapField;
    mapName = rawMapField === "0" ? "Earth" : ("Map #" + rawMapField);
  } else if (rawMapField) {
    mapName = rawMapField;
  }

  const resolvedScenario = resolveScenarioDisplay(rawScenPart, hostDeviceId, hostNick);
  const rawCompat = /^\d+$/.test(mapIdOrName) ? mapIdOrName : "0";

  return {
    raw: `1\t${passFlag}\t${players}\t${turn}\t${rawCompat}\t${hostNick}`,
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

function closeRoomByCode(code) {
  const roomObj = rooms.get(code);
  rooms.delete(code);
  games.delete(code);
  if (roomObj && roomObj.ws && roomObj.ws.readyState === 1) {
    try { roomObj.ws.close(); } catch (_) {}
  }
}

function closeConnectionsForDevice(targetId) {
  for (const [code, rObj] of rooms.entries()) {
    if (rObj && rObj.deviceId === targetId) closeRoomByCode(code);
  }
  for (const [wKey, wObj] of waiting.entries()) {
    if (wObj && wObj.deviceId === targetId) {
      waiting.delete(wKey);
      if (wObj.ws && wObj.ws.readyState === 1) {
        try { wObj.ws.close(); } catch (_) {}
      }
    }
  }
  if (typeof wss !== "undefined") {
    wss.clients.forEach((clientWs) => {
      if (clientWs && clientWs.deviceId === targetId && clientWs.readyState === 1) {
        try { clientWs.close(); } catch (_) {}
      }
    });
  }
}

function purgeDeadEntries() {
  for (const [code, roomObj] of rooms.entries()) {
    if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) {
      rooms.delete(code);
      games.delete(code);
    }
  }
  for (const [code] of games.entries()) {
    if (!rooms.has(code)) games.delete(code);
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
  if (!pendingCommands.has(normId)) pendingCommands.set(normId, []);
  const cmd = {
    id: "cmd-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
    type: sanitizeText(type || "WARN", 24).toUpperCase(),
    payload: sanitizeText(payload || "", 260),
    ts: Date.now()
  };
  const list = pendingCommands.get(normId);
  list.push(cmd);
  if (list.length > 20) list.shift();
  db.insertPendingCommand(normId, cmd).catch((e) => console.error("[DB] cmd insert err:", e.message));
  return true;
}

function signAdminToken() {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp, n: crypto.randomBytes(6).toString("hex") })).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Boolean(parsed && parsed.exp > Date.now());
  } catch (_) {
    return false;
  }
}

function safeComparePass(candidate) {
  if (!ADMIN_PASS || !candidate) return false;
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(ADMIN_PASS);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isAdminAuthorized(req, body) {
  const token = String(req.headers["x-admin-token"] || "").trim();
  if (verifyAdminToken(token)) return true;
  const headerPass = String(req.headers["x-admin-pass"] || "").trim();
  const bodyPass = body && body.password ? String(body.password).trim() : "";
  return safeComparePass(headerPass) || safeComparePass(bodyPass);
}

function sendJson(res, statusCode, payloadObj) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass, X-Admin-Token, X-Device-Id, X-Player-Nick"
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

function buildRoomsList() {
  purgeDeadEntries();
  const lobbies = [];
  const portalRooms = [];
  const uniqueDevices = new Set();
  let totalRoomPlayers = 0;
  let publicRooms = 0;

  for (const [code, roomObj] of rooms.entries()) {
    if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) continue;
    if (roomObj.deviceId) uniqueDevices.add(roomObj.deviceId);
    const hostIsVip = Boolean(roomObj.deviceId && vipIds.has(roomObj.deviceId));
    const g = games.get(code);
    if (g && g.parsed) {
      const finalScen = resolveScenarioDisplay(g.parsed.rawScenario, roomObj.deviceId, g.parsed.hostNick);
      g.parsed.scenarioName = finalScen;
      lobbies.push({
        hostNick: g.parsed.hostNick,
        hostIsVip,
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
        hostIsVip,
        map: g.parsed.mapName,
        scenario: finalScen,
        players: g.parsed.players,
        maxPlayers: 8,
        turn: g.parsed.turn,
        hasPassword: g.parsed.hasPass,
        inGame: g.parsed.turn > 0
      });
      totalRoomPlayers += g.parsed.players;
      publicRooms++;
    } else {
      totalRoomPlayers += 1;
    }
  }

  portalRooms.sort((a, b) => (b.hostIsVip - a.hostIsVip) || (b.players - a.players));
  lobbies.sort((a, b) => (b.hostIsVip - a.hostIsVip) || (b.players - a.players));
  return { lobbies, portalRooms, activePlayers: Math.max(totalRoomPlayers, uniqueDevices.size), publicRooms };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Pass, X-Admin-Token, X-Device-Id, X-Player-Nick"
    });
    return res.end();
  }

  const url = req.url || "/";
  let pathname = url;
  try {
    pathname = new URL(url, "http://" + (req.headers.host || "localhost")).pathname;
  } catch (_) {}

  if (pathname === "/config" || pathname === "/config.txt") {
    const hostHeader = req.headers.host || "aoh2-de-mp-server.onrender.com";
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(`${hostHeader}:443,TR-EU;\n1.0\n/\n/\n`);
  }

  if (pathname === "/health" || pathname === "/ping") {
    purgeDeadEntries();
    return sendJson(res, 200, {
      ok: true,
      status: "ok",
      db: "turso",
      activeRooms: rooms.size,
      publicRooms: games.size,
      totalDevices: devices.size,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000)
    });
  }

  if (pathname === "/api/lobby" || pathname === "/api/rooms") {
    const summary = buildRoomsList();
    return sendJson(res, 200, {
      ok: true,
      activeRooms: rooms.size,
      publicRooms: summary.publicRooms,
      activePlayers: summary.activePlayers,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      lobbies: summary.lobbies,
      rooms: summary.portalRooms,
      announcement: latestAnnouncement,
      noticeId: latestNoticeId
    });
  }

  if (pathname === "/api/game/sync" && req.method === "POST") {
    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId) || ("AOH-" + getClientIpHash(req).slice(0, 6).toUpperCase());
    const incomingNick = sanitizeText(body.nick || "", 24);
    const screen = sanitizeText(body.screen || "MAIN_MENU", 28).toUpperCase();
    const rawScen = sanitizeText(body.room || body.scenario || body.scenarioName || "-", 80);
    const ipHash = getClientIpHash(req);

    if (rawScen && rawScen !== "-" && rawScen !== "0") {
      registerScenarioName(body.scenarioCode || "", rawScen);
    }

    const now = Date.now();
    const prev = devices.get(deviceId);
    const effNick = (incomingNick && incomingNick !== "Player") ? incomingNick : ((prev && prev.nick) || "Player");
    const effScen = (rawScen && rawScen !== "-" && rawScen !== "0") ? rawScen : ((prev && prev.scenario) || "-");
    const changed = !prev || prev.nick !== effNick || prev.scenario !== effScen || prev.screen !== screen;

    const devObj = {
      deviceId,
      nick: effNick,
      screen,
      scenario: effScen,
      ipHash: ipHash || (prev && prev.ipHash) || "",
      isVip: vipIds.has(deviceId),
      isBanned: bannedIds.has(deviceId),
      isMuted: mutedIds.has(deviceId),
      banReason: (prev && prev.banReason) || "",
      firstSeen: (prev && prev.firstSeen) || now,
      lastSeen: now
    };
    devices.set(deviceId, devObj);
    if (changed) {
      db.saveDeviceNow(devObj).catch((e) => console.error("[DB] sync save err:", e.message));
    } else {
      db.markDeviceDirty(deviceId);
    }

    for (const [code, rObj] of rooms.entries()) {
      if (rObj && (rObj.deviceId === deviceId || (rObj.hostNick && rObj.hostNick.toLowerCase() === effNick.toLowerCase()))) {
        rObj.deviceId = deviceId;
        rObj.hostNick = effNick;
        const g = games.get(code);
        if (g && g.parsed && effScen && effScen !== "-" && effScen !== "0") {
          g.parsed.rawScenario = effScen;
          g.parsed.scenarioName = resolveScenarioDisplay(effScen, deviceId, effNick);
        }
      }
    }

    const popped = pendingCommands.get(deviceId) || [];
    if (popped.length > 0) {
      pendingCommands.delete(deviceId);
      db.deletePendingCommandsByIds(popped.map((c) => c.id)).catch(() => {});
    }

    const outCmds = popped.slice();
    if (devObj.isBanned && !outCmds.some((c) => c.type === "BAN")) {
      outCmds.push({
        id: "BAN-" + now,
        type: "BAN",
        payload: devObj.banReason || ("Your device (" + deviceId + ") has been banned by the Administrator."),
        ts: now
      });
    }

    return sendJson(res, 200, {
      ok: true,
      deviceId,
      noticeId: latestNoticeId,
      announcement: latestAnnouncement,
      isVip: devObj.isVip,
      isBanned: devObj.isBanned,
      isMuted: devObj.isMuted,
      commands: outCmds
    });
  }

  if (pathname === "/api/chat" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, chat: chatHistory.slice(-60) });
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId) || "WEB-GUEST";
    const adminFlag = isAdminAuthorized(req, body);
    const vipFlag = vipIds.has(deviceId);

    if (!adminFlag && (bannedIds.has(deviceId) || mutedIds.has(deviceId))) {
      return sendJson(res, 403, { ok: false, error: "Restricted" });
    }
    if (!adminFlag && !vipFlag) {
      const prevTs = lastChatTs.get(deviceId) || 0;
      if (Date.now() - prevTs < CHAT_COOLDOWN_MS) {
        return sendJson(res, 429, { ok: false, error: "Slow down" });
      }
      lastChatTs.set(deviceId, Date.now());
    }

    const text = sanitizeText(body.text || "", 200);
    if (!text) return sendJson(res, 400, { ok: false });

    const msg = {
      id: "msg-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
      deviceId: adminFlag ? "ADMIN" : deviceId,
      nick: adminFlag ? "Turgut Efe" : (sanitizeText(body.nick || "Player", 24) || "Player"),
      text,
      isAdmin: adminFlag,
      isVip: adminFlag || vipFlag,
      ts: Date.now()
    };
    chatHistory.push(msg);
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY);
    }
    db.insertChatMessage(msg).catch((e) => console.error("[DB] chat insert err:", e.message));
    return sendJson(res, 200, { ok: true, chat: chatHistory.slice(-60) });
  }

  if (pathname === "/api/admin/login" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!safeComparePass(body.password)) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }
    return sendJson(res, 200, { ok: true, token: signAdminToken(), expiresInMs: TOKEN_TTL_MS });
  }

  if (pathname === "/api/admin/state" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!isAdminAuthorized(req, body)) {
      return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    }

    const now = Date.now();
    const deviceList = Array.from(devices.values()).map((dev) => ({
      deviceId: dev.deviceId,
      nick: dev.nick,
      screen: dev.screen,
      scenario: resolveScenarioDisplay(dev.scenario, dev.deviceId, dev.nick),
      isVip: vipIds.has(dev.deviceId),
      isBanned: bannedIds.has(dev.deviceId),
      isMuted: mutedIds.has(dev.deviceId),
      online: (now - dev.lastSeen) < DEVICE_OFFLINE_MS,
      lastSeen: dev.lastSeen
    })).sort((a, b) => (a.online !== b.online ? (a.online ? -1 : 1) : (b.lastSeen - a.lastSeen)));

    const summary = buildRoomsList();
    return sendJson(res, 200, {
      ok: true,
      devices: deviceList,
      rooms: summary.portalRooms,
      chat: chatHistory.slice(-60),
      activeRooms: rooms.size,
      announcement: latestAnnouncement,
      noticeId: latestNoticeId,
      uptimeSec: Math.floor((now - startTime) / 1000)
    });
  }

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
      db.saveSetting("announcement", latestAnnouncement).catch(() => {});
      db.saveSetting("noticeId", latestNoticeId).catch(() => {});
      return sendJson(res, 200, { ok: true, noticeId: latestNoticeId });
    }

    if (action === "WARN" && targetId) {
      queueCommand(targetId, "WARN", message || "Official warning from Administrator Turgut Efe.");
      return sendJson(res, 200, { ok: true });
    }

    if (action === "KICK" && targetId) {
      queueCommand(targetId, "KICK", message || "You have been kicked by Administrator Turgut Efe.");
      closeConnectionsForDevice(targetId);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "BAN" && targetId) {
      bannedIds.add(targetId);
      const reason = message || ("Your device (" + targetId + ") has been banned by Administrator Turgut Efe.");
      const dev = devices.get(targetId) || {
        deviceId: targetId, nick: "Player", screen: "OFFLINE", scenario: "-",
        ipHash: "", isVip: vipIds.has(targetId), isMuted: mutedIds.has(targetId),
        firstSeen: Date.now(), lastSeen: Date.now()
      };
      dev.isBanned = true;
      dev.banReason = reason;
      devices.set(targetId, dev);
      db.saveDeviceNow(dev).catch(() => {});
      queueCommand(targetId, "BAN", reason);
      closeConnectionsForDevice(targetId);
      return sendJson(res, 200, { ok: true });
    }

    if (action === "UNBAN" && targetId) {
      bannedIds.delete(targetId);
      const dev = devices.get(targetId);
      if (dev) {
        dev.isBanned = false;
        dev.banReason = "";
        db.saveDeviceNow(dev).catch(() => {});
      }
      return sendJson(res, 200, { ok: true });
    }

    if ((action === "MUTE" || action === "UNMUTE") && targetId) {
      const muteState = action === "MUTE" ? true : false;
      if (muteState) mutedIds.add(targetId); else mutedIds.delete(targetId);
      const dev = devices.get(targetId);
      if (dev) {
        dev.isMuted = muteState;
        db.saveDeviceNow(dev).catch(() => {});
      }
      queueCommand(targetId, "WARN", muteState ? "You have been muted in lobby chat." : "Your lobby chat mute has been lifted.");
      return sendJson(res, 200, { ok: true });
    }

    if (action === "VIP" && targetId) {
      const nowVip = !vipIds.has(targetId);
      if (nowVip) {
        vipIds.add(targetId);
        queueCommand(targetId, "WARN", "Congratulations! Administrator Turgut Efe granted VIP status to your account.");
      } else {
        vipIds.delete(targetId);
      }
      const dev = devices.get(targetId);
      if (dev) {
        dev.isVip = nowVip;
        db.saveDeviceNow(dev).catch(() => {});
      }
      return sendJson(res, 200, { ok: true, isVip: nowVip });
    }

    if (action === "CLOSE_ROOM" && typeof body.code === "string") {
      closeRoomByCode(body.code.trim().toUpperCase());
      return sendJson(res, 200, { ok: true });
    }

    if (action === "DELETE_CHAT" && typeof body.msgId === "string") {
      const targetMsgId = body.msgId.trim();
      const idx = chatHistory.findIndex((m) => m.id === targetMsgId);
      if (idx !== -1) {
        chatHistory.splice(idx, 1);
        db.deleteChatMessage(targetMsgId).catch(() => {});
      }
      return sendJson(res, 200, { ok: true });
    }

    if (action === "ADMIN_CHAT" && message) {
      const msg = {
        id: "msg-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
        deviceId: "ADMIN", nick: "Turgut Efe", text: message,
        isAdmin: true, isVip: true, ts: Date.now()
      };
      chatHistory.push(msg);
      if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY);
      db.insertChatMessage(msg).catch(() => {});
      return sendJson(res, 200, { ok: true });
    }

    if (action === "CLEAR_CHAT") {
      chatHistory.length = 0;
      const sysMsg = {
        id: "sys-clear-" + Date.now(), deviceId: "SYSTEM", nick: "Turgut Efe",
        text: "Lobby chat was cleared by Administrator Turgut Efe.",
        isAdmin: true, isVip: true, ts: Date.now()
      };
      chatHistory.push(sysMsg);
      db.clearChatMessages().then(() => db.insertChatMessage(sysMsg)).catch(() => {});
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 400, { ok: false, error: "Invalid action" });
  }

  const safeRel = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const fileCandidate = path.join(__dirname, safeRel);
  if (
    pathname !== "/" && pathname !== "/index.html" &&
    fileCandidate.startsWith(__dirname) && fileCandidate !== __filename &&
    fs.existsSync(fileCandidate) && fs.statSync(fileCandidate).isFile()
  ) {
    const ext = path.extname(fileCandidate).toLowerCase();
    const mimeTypes = {
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    return fs.createReadStream(fileCandidate).pipe(res);
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(renderWebFn ? renderWebFn() : "<h1>AoH2 DE Multiplayer Server</h1>");
});

const wss = new WebSocketServer({ server, maxPayload: 256 * 1024 * 1024, perMessageDeflate: false });

wss.on("connection", (ws, req) => {
  const headerDevId = normalizeDeviceId(req.headers["x-device-id"] || "");
  const deviceId = headerDevId || ("AOH-" + getClientIpHash(req).slice(0, 6).toUpperCase());

  if (bannedIds.has(deviceId)) {
    try { ws.close(); } catch (_) {}
    return;
  }

  ws.isAlive = true;
  ws.deviceId = deviceId;
  ws.on("pong", () => { ws.isAlive = true; });

  let buffer = Buffer.alloc(0);
  let state = "HANDSHAKE";
  let roomCode = null;
  let infoKey = null;
  let peerWs = null;
  let cleaned = false;

  function sendLine(str) {
    if (ws.readyState === 1) {
      try { ws.send(Buffer.from(str + "\n", "utf8")); } catch (_) {}
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
      if (waitObj && waitObj.ws === ws) waiting.delete(wKey);
    }
    if (peerWs) {
      const target = peerWs;
      peerWs = null;
      if (target.readyState === 1) {
        try { target.close(); } catch (_) {}
      }
    }
  }

  ws.on("message", (data) => {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (state === "PIPE") {
      if (peerWs && peerWs.readyState === 1) {
        try { peerWs.send(chunk); } catch (_) { cleanup(); }
      }
      return;
    }

    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > 65536) {
      cleanup();
      try { ws.close(); } catch (_) {}
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
            if (rItem) rItem.hostNick = parsed.hostNick;
          }
        }
        continue;
      }

      if (state === "HANDSHAKE") {
        const parts = line.split(" ");
        const cmd = parts[0];

        if (parts.length === 1 && cmd === "H" && rooms.size < MAX_ROOMS) {
          if (bannedIds.has(deviceId)) {
            try { ws.close(); } catch (_) {}
            return;
          }
          for (const [oldCode, oldRoom] of rooms.entries()) {
            if (oldRoom && oldRoom.deviceId === deviceId) closeRoomByCode(oldCode);
          }
          roomCode = newCode();
          rooms.set(roomCode, { ws, deviceId, createdAt: Date.now() });
          infoKey = roomCode;
          games.set(infoKey, { type: "O", info: null, parsed: null });
          state = "HOST_INFO";
          sendLine("C " + roomCode);
        } else if (parts.length === 1 && cmd === "L") {
          purgeDeadEntries();
          const listEntries = [];
          for (const [k, v] of games.entries()) {
            if (v && v.info && rooms.has(k)) {
              const rObj = rooms.get(k);
              const isVipHost = Boolean(rObj && rObj.deviceId && vipIds.has(rObj.deviceId));
              listEntries.push({ isVipHost, line: `S\t${v.type}\t${k}\t${v.info}\n` });
            }
          }
          listEntries.sort((a, b) => Number(b.isVipHost) - Number(a.isVipHost));
          const out = listEntries.map((e) => e.line).join("") + ".\n";
          if (ws.readyState === 1) {
            try { ws.send(Buffer.from(out, "utf8")); } catch (_) {}
          }
          try { ws.close(); } catch (_) {}
          return;
        } else if (parts.length === 2 && cmd === "Q") {
          const roomObj = rooms.get(parts[1]);
          sendLine(Boolean(roomObj && roomObj.ws && roomObj.ws.readyState === 1) ? "Y" : "N");
          try { ws.close(); } catch (_) {}
          return;
        } else if (parts.length === 2 && cmd === "J") {
          if (bannedIds.has(deviceId)) {
            try { ws.close(); } catch (_) {}
            return;
          }
          const targetCode = parts[1];
          const roomObj = rooms.get(targetCode);
          if (!roomObj || !roomObj.ws || roomObj.ws.readyState !== 1) {
            try { ws.close(); } catch (_) {}
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
            try { ws.close(); } catch (_) {}
            return;
          }
          setTimeout(() => {
            if (waiting.has(waitKey)) {
              waiting.delete(waitKey);
              if (ws.readyState === 1) {
                try { ws.close(); } catch (_) {}
              }
            }
          }, JOIN_TIMEOUT_MS);
          return;
        } else if (parts.length === 3 && cmd === "D" && rooms.has(parts[1])) {
          const waitKey = `${parts[1]} ${parts[2]}`;
          const waitObj = waiting.get(waitKey);
          waiting.delete(waitKey);
          if (!waitObj || !waitObj.ws || waitObj.ws.readyState !== 1) {
            try { ws.close(); } catch (_) {}
            return;
          }
          peerWs = waitObj.ws;
          waitObj.ws._setPeer(ws);
          state = "PIPE";
          if (buffer.length > 0 && peerWs.readyState === 1) {
            try { peerWs.send(buffer); } catch (_) {}
            buffer = Buffer.alloc(0);
          }
          return;
        } else {
          try { ws.close(); } catch (_) {}
          return;
        }
      }
    }
  });

  ws._setPeer = (target) => {
    peerWs = target;
    state = "PIPE";
    if (buffer.length > 0 && peerWs.readyState === 1) {
      try { peerWs.send(buffer); } catch (_) {}
      buffer = Buffer.alloc(0);
    }
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch (_) {}
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on("close", () => clearInterval(heartbeat));

async function gracefulShutdown(signal) {
  console.log(`[SYS] ${signal} alindi, son veriler Turso'ya yaziliyor...`);
  try { await db.flushDirtyDevices(devices); } catch (_) {}
  try { await db.closeDb(); } catch (_) {}
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

(async () => {
  try {
    await db.initWithRetry(3);
    const loaded = await db.loadInitialState();
    devices = loaded.devices;
    bannedIds = loaded.bannedIds;
    vipIds = loaded.vipIds;
    mutedIds = loaded.mutedIds;
    pendingCommands = loaded.pendingCommands;
    chatHistory = loaded.chatHistory;
    scenarioRegistry = loaded.scenarioRegistry;

    if (loaded.settings.has("announcement")) latestAnnouncement = loaded.settings.get("announcement");
    if (loaded.settings.has("noticeId")) latestNoticeId = loaded.settings.get("noticeId");

    if (chatHistory.length === 0) {
      const welcomeMsg = {
        id: "sys-welcome-001", deviceId: "SYSTEM", nick: "Turgut Efe",
        text: "Welcome to Age of History II Definitive Edition — Turgut Multiplayer!",
        isAdmin: true, isVip: true, ts: Date.now()
      };
      chatHistory.push(welcomeMsg);
      await db.insertChatMessage(welcomeMsg).catch(() => {});
    }
    db.startPeriodicFlush(devices);
  } catch (err) {
    console.error("[DB FATAL] Baslangicta Turso yuklenemedi, RAM fallback aktif:", err.message);
  }

  server.listen(PORT, () => {
    console.log("AoH2DE Turgut Edition MP Relay & Web (Turso Persistent) listening on port " + PORT);
  });
})();
