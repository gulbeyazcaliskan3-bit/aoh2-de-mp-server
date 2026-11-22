const { createClient } = require("@libsql/client");

const DIRTY_FLUSH_MS = 120000;
const MAX_CHAT_LOAD = 120;

let client = null;
let flushTimer = null;
const dirtyDeviceIds = new Set();

function resolveConfig() {
  const url = (
    process.env.TURSO_DATABASE_URL ||
    process.env.LIBSQL_DB_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
  const authToken = (
    process.env.TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_DB_AUTH_TOKEN ||
    ""
  ).trim();

  if (!url) {
    console.warn("[DB WARN] TURSO_DATABASE_URL tanimli degil! Gecici yerel dosya (file:local-fallback.db) kullaniliyor.");
    return { url: "file:local-fallback.db" };
  }
  if (url.startsWith("file:")) {
    return { url };
  }
  return { url, authToken };
}

function getClient() {
  if (!client) {
    client = createClient(resolveConfig());
  }
  return client;
}

async function initSchema() {
  const db = getClient();
  const statements = [
    `CREATE TABLE IF NOT EXISTS devices (
      device_id   TEXT PRIMARY KEY,
      nick        TEXT NOT NULL DEFAULT 'Player',
      screen      TEXT NOT NULL DEFAULT 'MAIN_MENU',
      scenario    TEXT NOT NULL DEFAULT '-',
      ip_hash     TEXT NOT NULL DEFAULT '',
      is_vip      INTEGER NOT NULL DEFAULT 0,
      is_banned   INTEGER NOT NULL DEFAULT 0,
      is_muted    INTEGER NOT NULL DEFAULT 0,
      ban_reason  TEXT NOT NULL DEFAULT '',
      first_seen  INTEGER NOT NULL,
      last_seen   INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pending_commands (
      id          TEXT PRIMARY KEY,
      device_id   TEXT NOT NULL,
      type        TEXT NOT NULL,
      payload     TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pending_dev ON pending_commands(device_id)`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      device_id   TEXT NOT NULL,
      nick        TEXT NOT NULL,
      text        TEXT NOT NULL,
      is_admin    INTEGER NOT NULL DEFAULT 0,
      is_vip      INTEGER NOT NULL DEFAULT 0,
      ts          INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_chat_ts ON chat_messages(ts)`,
    `CREATE TABLE IF NOT EXISTS server_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS scenarios (
      code        TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      updated_at  INTEGER NOT NULL
    )`
  ];

  for (const sql of statements) {
    await db.execute(sql);
  }
}

async function initWithRetry(maxAttempts = 3) {
  let lastErr = null;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await initSchema();
      console.log("[DB] Turso/libSQL baglantisi ve tablolar hazir.");
      return;
    } catch (err) {
      lastErr = err;
      console.error(`[DB] Baglanti denemesi ${i}/${maxAttempts} basarisiz:`, err.message);
      if (i < maxAttempts) {
        await new Promise((r) => setTimeout(r, i * 1500));
      }
    }
  }
  throw lastErr;
}

async function loadInitialState() {
  const db = getClient();
  const [devRes, cmdRes, chatRes, setRes, scenRes] = await Promise.all([
    db.execute("SELECT * FROM devices"),
    db.execute("SELECT * FROM pending_commands ORDER BY created_at ASC"),
    db.execute({
      sql: "SELECT * FROM chat_messages ORDER BY ts DESC LIMIT ?",
      args: [MAX_CHAT_LOAD]
    }),
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

  const chatHistory = chatRes.rows
    .slice()
    .reverse()
    .map((row) => ({
      id: String(row.id),
      deviceId: String(row.device_id),
      nick: String(row.nick),
      text: String(row.text),
      isAdmin: Boolean(Number(row.is_admin)),
      isVip: Boolean(Number(row.is_vip)),
      ts: Number(row.ts || 0)
    }));

  const settings = new Map();
  for (const row of setRes.rows) {
    settings.set(String(row.key), String(row.value));
  }

  const scenarioRegistry = new Map();
  for (const row of scenRes.rows) {
    scenarioRegistry.set(String(row.code), String(row.name));
  }

  return {
    devices,
    bannedIds,
    vipIds,
    mutedIds,
    pendingCommands,
    chatHistory,
    settings,
    scenarioRegistry
  };
}

function buildDeviceUpsertStatement(dev) {
  return {
    sql: `INSERT INTO devices (
            device_id, nick, screen, scenario, ip_hash,
            is_vip, is_banned, is_muted, ban_reason, first_seen, last_seen
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(device_id) DO UPDATE SET
            nick = excluded.nick,
            screen = excluded.screen,
            scenario = excluded.scenario,
            ip_hash = CASE WHEN excluded.ip_hash != '' THEN excluded.ip_hash ELSE devices.ip_hash END,
            is_vip = excluded.is_vip,
            is_banned = excluded.is_banned,
            is_muted = excluded.is_muted,
            ban_reason = excluded.ban_reason,
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
    console.error("[DB] Dirty flush hatasi:", err.message);
    return 0;
  }
}

function startPeriodicFlush(devicesMap) {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(() => {
    flushDirtyDevices(devicesMap).catch(() => {});
  }, DIRTY_FLUSH_MS);
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
  const placeholders = ids.map(() => "?").join(",");
  await getClient().execute({
    sql: `DELETE FROM pending_commands WHERE id IN (${placeholders})`,
    args: ids
  });
}

async function insertChatMessage(msg) {
  await getClient().execute({
    sql: "INSERT OR REPLACE INTO chat_messages (id, device_id, nick, text, is_admin, is_vip, ts) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      msg.id,
      msg.deviceId,
      msg.nick,
      msg.text,
      msg.isAdmin ? 1 : 0,
      msg.isVip ? 1 : 0,
      Number(msg.ts || Date.now())
    ]
  });
}

async function deleteChatMessage(id) {
  await getClient().execute({
    sql: "DELETE FROM chat_messages WHERE id = ?",
    args: [id]
  });
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
  initWithRetry,
  loadInitialState,
  saveDeviceNow,
  markDeviceDirty,
  flushDirtyDevices,
  startPeriodicFlush,
  insertPendingCommand,
  deletePendingCommandsByIds,
  insertChatMessage,
  deleteChatMessage,
  clearChatMessages,
  saveSetting,
  saveScenario,
  closeDb
};
