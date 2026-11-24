const { createClient } = require("@libsql/client");

const DIRTY_FLUSH_MS = 120000;
const MAX_CHAT_LOAD = 120;

let client = null;
let flushTimer = null;
const dirtyDeviceIds = new Set();

function resolveConfig() {
  const url = (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_DB_URL || process.env.DATABASE_URL || "").trim();
  const authToken = (process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_DB_AUTH_TOKEN || "").trim();
  if (!url) {
    console.warn("[DB WARN] TURSO_DATABASE_URL missing, using file:local-fallback.db");
    return { url: "file:local-fallback.db" };
  }
  return url.startsWith("file:") ? { url } : { url, authToken };
}

function getClient() {
  if (!client) client = createClient(resolveConfig());
  return client;
}

async function ensureColumn(db, table, colName, colDef) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((r) => String(r.name) === colName);
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
  }
}

async function initSchema() {
  const db = getClient();
  const statements = [
    `CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      nick TEXT NOT NULL DEFAULT 'Player',
      screen TEXT NOT NULL DEFAULT 'MAIN_MENU',
      scenario TEXT NOT NULL DEFAULT '-',
      ip_hash TEXT NOT NULL DEFAULT '',
      is_vip INTEGER NOT NULL DEFAULT 0,
      is_banned INTEGER NOT NULL DEFAULT 0,
      is_muted INTEGER NOT NULL DEFAULT 0,
      ban_reason TEXT NOT NULL DEFAULT '',
      appear_offline INTEGER NOT NULL DEFAULT 0,
      bio TEXT NOT NULL DEFAULT '',
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pending_commands (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pending_dev ON pending_commands(device_id)`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      nick TEXT NOT NULL,
      text TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_vip INTEGER NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chat_ts ON chat_messages(ts)`,
    `CREATE TABLE IF NOT EXISTS server_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS scenarios (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS friendships (
      pair_key TEXT PRIMARY KEY,
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_fr_a ON friendships(user_a)`,
    `CREATE INDEX IF NOT EXISTS idx_fr_b ON friendships(user_b)`,
    `CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      pair_key TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      from_nick TEXT NOT NULL,
      text TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dm_pair ON direct_messages(pair_key, ts)`,
    `CREATE INDEX IF NOT EXISTS idx_dm_unread ON direct_messages(to_id, is_read)`,
    `CREATE TABLE IF NOT EXISTS room_invites (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      from_nick TEXT NOT NULL,
      room_code TEXT NOT NULL,
      has_pass INTEGER NOT NULL DEFAULT 0,
      map_name TEXT NOT NULL,
      scenario_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_inv_to ON room_invites(to_id)`
  ];

  for (const sql of statements) await db.execute(sql);
  await ensureColumn(db, "devices", "appear_offline", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "devices", "bio", "TEXT NOT NULL DEFAULT ''");
}

async function initWithRetry(maxAttempts = 3) {
  let lastErr = null;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await initSchema();
      console.log("[DB] Turso/libSQL schema & social tables ready.");
      return;
    } catch (err) {
      lastErr = err;
      console.error(`[DB] Attempt ${i}/${maxAttempts} failed:`, err.message);
      if (i < maxAttempts) await new Promise((r) => setTimeout(r, i * 1500));
    }
  }
  throw lastErr;
}

async function loadInitialState() {
  const db = getClient();
  const [devRes, cmdRes, chatRes, setRes, scenRes] = await Promise.all([
    db.execute("SELECT * FROM devices"),
    db.execute("SELECT * FROM pending_commands ORDER BY created_at ASC"),
    db.execute({ sql: "SELECT * FROM chat_messages ORDER BY ts DESC LIMIT ?", args: [MAX_CHAT_LOAD] }),
    db.execute("SELECT key, value FROM server_settings"),
    db.execute("SELECT code, name FROM scenarios")
  ]);

  const devices = new Map();
  const bannedIds = new Set();
  const vipIds = new Set();
  const mutedIds = new Set();

  for (const row of devRes.rows) {
    const devId = String(row.device_id);
    const isVip = Boolean(Number(row.is_vip));
    const isBanned = Boolean(Number(row.is_banned));
    const isMuted = Boolean(Number(row.is_muted));
    devices.set(devId, {
      deviceId: devId,
      nick: String(row.nick || "Player"),
      screen: String(row.screen || "MAIN_MENU"),
      scenario: String(row.scenario || "-"),
      ipHash: String(row.ip_hash || ""),
      isVip,
      isBanned,
      isMuted,
      banReason: String(row.ban_reason || ""),
      appearOffline: Boolean(Number(row.appear_offline || 0)),
      bio: String(row.bio || ""),
      firstSeen: Number(row.first_seen || 0),
      lastSeen: Number(row.last_seen || 0)
    });
    if (isVip) vipIds.add(devId);
    if (isBanned) bannedIds.add(devId);
    if (isMuted) mutedIds.add(devId);
  }

  const pendingCommands = new Map();
  for (const row of cmdRes.rows) {
    const devId = String(row.device_id);
    if (!pendingCommands.has(devId)) pendingCommands.set(devId, []);
    pendingCommands.get(devId).push({
      id: String(row.id),
      type: String(row.type),
      payload: String(row.payload),
      ts: Number(row.created_at || 0)
    });
  }

  const chatHistory = chatRes.rows.slice().reverse().map((row) => ({
    id: String(row.id),
    deviceId: String(row.device_id),
    nick: String(row.nick),
    text: String(row.text),
    isAdmin: Boolean(Number(row.is_admin)),
    isVip: Boolean(Number(row.is_vip)),
    ts: Number(row.ts || 0)
  }));

  const settings = new Map();
  for (const row of setRes.rows) settings.set(String(row.key), String(row.value));
  const scenarioRegistry = new Map();
  for (const row of scenRes.rows) scenarioRegistry.set(String(row.code), String(row.name));

  return { devices, bannedIds, vipIds, mutedIds, pendingCommands, chatHistory, settings, scenarioRegistry };
}

function buildDeviceUpsertStatement(dev) {
  return {
    sql: `INSERT INTO devices (
            device_id, nick, screen, scenario, ip_hash,
            is_vip, is_banned, is_muted, ban_reason, appear_offline, bio, first_seen, last_seen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            nick = excluded.nick,
            screen = excluded.screen,
            scenario = excluded.scenario,
            ip_hash = CASE WHEN excluded.ip_hash != '' THEN excluded.ip_hash ELSE devices.ip_hash END,
            is_vip = excluded.is_vip,
            is_banned = excluded.is_banned,
            is_muted = excluded.is_muted,
            ban_reason = excluded.ban_reason,
            appear_offline = excluded.appear_offline,
            bio = excluded.bio,
            last_seen = excluded.last_seen`,
    args: [
      dev.deviceId,
      dev.nick || "Player",
      dev.screen || "MAIN_MENU",
      dev.scenario || "-",
      dev.ipHash || "",
      dev.isVip ? 1 : 0,
      dev.isBanned ? 1 : 0,
      dev.isMuted ? 1 : 0,
      dev.banReason || "",
      dev.appearOffline ? 1 : 0,
      dev.bio || "",
      Number(dev.firstSeen || Date.now()),
      Number(dev.lastSeen || Date.now())
    ]
  };
}

async function saveDeviceNow(dev) {
  if (!dev || !dev.deviceId) return;
  dirtyDeviceIds.delete(dev.deviceId);
  await getClient().execute(buildDeviceUpsertStatement(dev));
}

function markDeviceDirty(deviceId) {
  if (deviceId) dirtyDeviceIds.add(deviceId);
}

async function flushDirtyDevices(devicesMap) {
  if (dirtyDeviceIds.size === 0 || !devicesMap) return 0;
  const ids = Array.from(dirtyDeviceIds);
  const stmts = [];
  const flushedIds = [];
  for (const id of ids) {
    const dev = devicesMap.get(id);
    if (dev) {
      stmts.push(buildDeviceUpsertStatement(dev));
      flushedIds.push(id);
    }
    dirtyDeviceIds.delete(id);
  }
  if (stmts.length === 0) return 0;
  try {
    await getClient().batch(stmts, "write");
    return stmts.length;
  } catch (err) {
    for (const id of flushedIds) dirtyDeviceIds.add(id);
    console.error("[DB] Dirty flush error:", err.message);
    return 0;
  }
}

function startPeriodicFlush(devicesMap) {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => { flushDirtyDevices(devicesMap).catch(() => {}); }, DIRTY_FLUSH_MS);
  if (flushTimer.unref) flushTimer.unref();
}

async function insertPendingCommand(deviceId, cmd) {
  await getClient().execute({
    sql: "INSERT OR REPLACE INTO pending_commands (id, device_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [cmd.id, deviceId, cmd.type, cmd.payload, Number(cmd.ts || Date.now())]
  });
}

async function deletePendingCommandsByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const ph = ids.map(() => "?").join(",");
  await getClient().execute({ sql: `DELETE FROM pending_commands WHERE id IN (${ph})`, args: ids });
}

async function insertChatMessage(msg) {
  await getClient().execute({
    sql: "INSERT OR REPLACE INTO chat_messages (id, device_id, nick, text, is_admin, is_vip, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [msg.id, msg.deviceId, msg.nick, msg.text, msg.isAdmin ? 1 : 0, msg.isVip ? 1 : 0, Number(msg.ts || Date.now())]
  });
}

async function deleteChatMessage(id) {
  await getClient().execute({ sql: "DELETE FROM chat_messages WHERE id = ?", args: [id] });
}

async function clearChatMessages() {
  await getClient().execute("DELETE FROM chat_messages");
}

async function saveSetting(key, value) {
  await getClient().execute({
    sql: `INSERT INTO server_settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [String(key), String(value), Date.now()]
  });
}

async function saveScenario(code, name) {
  if (!code || !name) return;
  await getClient().execute({
    sql: `INSERT INTO scenarios (code, name, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(code) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
    args: [String(code), String(name), Date.now()]
  });
}

async function getFriendshipsFor(deviceId) {
  const res = await getClient().execute({
    sql: "SELECT * FROM friendships WHERE user_a = ? OR user_b = ? ORDER BY updated_at DESC",
    args: [deviceId, deviceId]
  });
  return res.rows.map((r) => ({
    pairKey: String(r.pair_key),
    userA: String(r.user_a),
    userB: String(r.user_b),
    requesterId: String(r.requester_id),
    status: String(r.status),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at)
  }));
}

async function getFriendshipPair(pairKey) {
  const res = await getClient().execute({
    sql: "SELECT * FROM friendships WHERE pair_key = ? LIMIT 1",
    args: [pairKey]
  });
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    pairKey: String(r.pair_key),
    userA: String(r.user_a),
    userB: String(r.user_b),
    requesterId: String(r.requester_id),
    status: String(r.status),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at)
  };
}

async function upsertFriendship(row) {
  await getClient().execute({
    sql: `INSERT INTO friendships (pair_key, user_a, user_b, requester_id, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(pair_key) DO UPDATE SET
            requester_id = excluded.requester_id,
            status = excluded.status,
            updated_at = excluded.updated_at`,
    args: [row.pairKey, row.userA, row.userB, row.requesterId, row.status, row.createdAt, row.updatedAt]
  });
}

async function deleteFriendship(pairKey) {
  await getClient().execute({ sql: "DELETE FROM friendships WHERE pair_key = ?", args: [pairKey] });
}

async function insertDirectMessage(msg) {
  await getClient().execute({
    sql: "INSERT INTO direct_messages (id, pair_key, from_id, to_id, from_nick, text, is_read, ts) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
    args: [msg.id, msg.pairKey, msg.fromId, msg.toId, msg.fromNick, msg.text, msg.ts]
  });
}

async function getDirectThread(pairKey, limit = 50) {
  const res = await getClient().execute({
    sql: "SELECT * FROM direct_messages WHERE pair_key = ? ORDER BY ts DESC LIMIT ?",
    args: [pairKey, limit]
  });
  return res.rows.slice().reverse().map((r) => ({
    id: String(r.id),
    fromId: String(r.from_id),
    toId: String(r.to_id),
    fromNick: String(r.from_nick),
    text: String(r.text),
    isRead: Boolean(Number(r.is_read)),
    ts: Number(r.ts)
  }));
}

async function markThreadRead(pairKey, readerId) {
  await getClient().execute({
    sql: "UPDATE direct_messages SET is_read = 1 WHERE pair_key = ? AND to_id = ? AND is_read = 0",
    args: [pairKey, readerId]
  });
}

async function getUnreadCountsBySender(readerId) {
  const res = await getClient().execute({
    sql: "SELECT from_id, COUNT(*) AS cnt FROM direct_messages WHERE to_id = ? AND is_read = 0 GROUP BY from_id",
    args: [readerId]
  });
  const map = new Map();
  for (const r of res.rows) map.set(String(r.from_id), Number(r.cnt || 0));
  return map;
}

async function insertRoomInvite(inv) {
  await getClient().execute({
    sql: `INSERT OR REPLACE INTO room_invites (id, from_id, to_id, from_nick, room_code, has_pass, map_name, scenario_name, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [inv.id, inv.fromId, inv.toId, inv.fromNick, inv.roomCode, inv.hasPass ? 1 : 0, inv.mapName, inv.scenarioName, inv.createdAt, inv.expiresAt]
  });
}

async function getActiveInvitesFor(toId, now) {
  await getClient().execute({ sql: "DELETE FROM room_invites WHERE expires_at <= ?", args: [now] });
  const res = await getClient().execute({
    sql: "SELECT * FROM room_invites WHERE to_id = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 10",
    args: [toId, now]
  });
  return res.rows.map((r) => ({
    id: String(r.id),
    fromId: String(r.from_id),
    fromNick: String(r.from_nick),
    roomCode: String(r.room_code),
    hasPass: Boolean(Number(r.has_pass)),
    mapName: String(r.map_name),
    scenarioName: String(r.scenario_name),
    createdAt: Number(r.created_at),
    expiresAt: Number(r.expires_at)
  }));
}

async function deleteRoomInvite(id) {
  await getClient().execute({ sql: "DELETE FROM room_invites WHERE id = ?", args: [id] });
}

async function closeDb() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (client) {
    try { client.close(); } catch (_) {}
    client = null;
  }
}

module.exports = {
  initWithRetry, loadInitialState, saveDeviceNow, markDeviceDirty,
  flushDirtyDevices, startPeriodicFlush, insertPendingCommand, deletePendingCommandsByIds,
  insertChatMessage, deleteChatMessage, clearChatMessages, saveSetting, saveScenario,
  getFriendshipsFor, getFriendshipPair, upsertFriendship, deleteFriendship,
  insertDirectMessage, getDirectThread, markThreadRead, getUnreadCountsBySender,
  insertRoomInvite, getActiveInvitesFor, deleteRoomInvite, closeDb
};
