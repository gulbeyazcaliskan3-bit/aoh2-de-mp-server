const crypto = require('crypto');

const ADMIN_PASS = 'tuef7603316';
const MAX_CHAT_HISTORY = 60;

const deviceRegistry = new Map();
const bannedDevices = new Set();
const vipDevices = new Set();
const pendingDeviceCommands = new Map();
const lobbyChat = [];

const serverState = {
  noticeId: 'N-' + Date.now(),
  announcement: 'Welcome to AoH2 DE Turgut Edition Multiplayer! Server is online.',
  maintenanceMode: false,
  downloadUrl: 'https://www.mediafire.com/file/dvd3fdnoibv47as/AgeOfHistoryDEMultiplayer1.apk/file',
  downloadLabel: 'Download APK (405 MB)',
  telegramUrl: 'https://t.me/Ageofmultiplayer'
};

function resolvePermanentDeviceId(req, customToken) {
  if (customToken && typeof customToken === 'string') {
    const clean = customToken.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    if (clean.startsWith('AOH-') && clean.length >= 8 && clean.length <= 16) {
      return clean;
    }
  }
  const fwd = req && req.headers ? req.headers['x-forwarded-for'] : null;
  const rawIp = Array.isArray(fwd)
    ? fwd.at(0)
    : typeof fwd === 'string'
      ? fwd.split(',').at(0).trim()
      : (req && req.socket && req.socket.remoteAddress) || 'unknown';
  const hash = crypto.createHash('sha256').update('AOH2_PERM_' + String(rawIp)).digest('hex').toUpperCase();
  return 'AOH-' + hash.slice(0, 6);
}

function touchDevice(deviceId, nick, statusText, roomCode) {
  if (!deviceId) return;
  const now = Date.now();
  const prev = deviceRegistry.get(deviceId) || {
    deviceId,
    nick: 'Player',
    firstSeen: now,
    lastSeen: now,
    statusText: 'Ana Menüde',
    lastRoom: '-'
  };

  if (nick && typeof nick === 'string') {
    const cleanNick = nick.replace(/[\x00-\x1f]/g, '').trim().slice(0, 28);
    if (cleanNick && cleanNick !== 'Host' && cleanNick !== 'Kurucu' && cleanNick !== 'Player') {
      prev.nick = cleanNick;
    }
  }
  if (!prev.nick) {
    prev.nick = 'Player';
  }

  prev.lastSeen = now;
  if (statusText) {
    prev.statusText = String(statusText).slice(0, 64);
  }
  if (roomCode !== undefined) {
    prev.lastRoom = roomCode || '-';
  }
  deviceRegistry.set(deviceId, prev);
}

function queueDeviceCommand(deviceId, type, payload) {
  if (!deviceId) return;
  const targetId = deviceId.trim().toUpperCase();
  const list = pendingDeviceCommands.get(targetId) || [];
  list.push({
    id: crypto.randomBytes(4).toString('hex'),
    type,
    payload: String(payload || '').slice(0, 200),
    ts: Date.now()
  });
  if (list.length > 10) list.shift();
  pendingDeviceCommands.set(targetId, list);
}

function popDeviceCommands(deviceId) {
  if (!deviceId) return [];
  const targetId = deviceId.trim().toUpperCase();
  const list = pendingDeviceCommands.get(targetId) || [];
  pendingDeviceCommands.delete(targetId);
  return list;
}

function pushChatMessage(senderId, senderNick, text, isAdmin) {
  const cleanText = String(text || '').replace(/[\x00-\x1f]/g, '').trim().slice(0, 220);
  if (!cleanText) return null;
  const cleanNick = String(senderNick || 'Player').replace(/[\x00-\x1f]/g, '').trim().slice(0, 28) || 'Player';
  const msg = {
    id: crypto.randomBytes(4).toString('hex'),
    deviceId: senderId || 'GAME',
    nick: cleanNick,
    text: cleanText,
    isAdmin: Boolean(isAdmin),
    isVip: Boolean(senderId && vipDevices.has(senderId)),
    ts: Date.now()
  };
  lobbyChat.push(msg);
  if (lobbyChat.length > MAX_CHAT_HISTORY) {
    lobbyChat.shift();
  }
  return msg;
}

function deleteChatMessageById(msgId) {
  const idx = lobbyChat.findIndex((m) => m.id === msgId);
  if (idx !== -1) {
    lobbyChat.splice(idx, 1);
    return true;
  }
  return false;
}

pushChatMessage('ADMIN', 'Turgut Efe', 'Resmi Turgut Edition Lobi Sohbeti aktif!', true);
function handleGameSync(req, body, onlineIds) {
  const devId = resolvePermanentDeviceId(req, body.deviceId);
  if (onlineIds) onlineIds.add(devId);

  const nick = body.nick || 'Player';
  const screen = body.screen || 'Ana Menüde';
  const room = body.room || '-';

  touchDevice(devId, nick, screen, room);

  const isBanned = bannedDevices.has(devId);
  const isVip = vipDevices.has(devId);
  const commands = popDeviceCommands(devId);

  if (isBanned) {
    commands.push({
      id: 'BAN-' + Date.now(),
      type: 'BAN',
      payload: 'Your device (' + devId + ') has been banned by the Administrator.',
      ts: Date.now()
    });
  }

  return {
    ok: true,
    deviceId: devId,
    isBanned,
    isVip,
    noticeId: serverState.noticeId,
    announcement: serverState.announcement,
    maintenanceMode: serverState.maintenanceMode,
    commands
  };
}

function handleAdminAction(body, context) {
  if (!body || body.password !== ADMIN_PASS) {
    return { status: 401, data: { ok: false, error: 'Invalid admin password' } };
  }

  const { rooms, games, waiting, closeRoomByCode, purgeDeadEntries, startTime } = context;
  const action = body.action || 'status';

  if (action === 'update_settings') {
    if (typeof body.announcement === 'string') {
      const cleanAnn = body.announcement.replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
      if (cleanAnn && cleanAnn !== serverState.announcement) {
        serverState.announcement = cleanAnn;
        serverState.noticeId = 'N-' + Date.now();
      }
    }
    if (typeof body.maintenanceMode === 'boolean') {
      serverState.maintenanceMode = body.maintenanceMode;
    }
  } else if (action === 'kick_room' && typeof body.code === 'string') {
    closeRoomByCode(body.code.trim().toUpperCase());
  } else if (action === 'clear_all_rooms') {
    for (const code of Array.from(rooms.keys())) {
      closeRoomByCode(code);
    }
    waiting.clear();
  } else if (action === 'toggle_ban' && typeof body.deviceId === 'string') {
    const targetId = body.deviceId.trim().toUpperCase();
    if (bannedDevices.has(targetId)) {
      bannedDevices.delete(targetId);
    } else {
      bannedDevices.add(targetId);
      queueDeviceCommand(targetId, 'BAN', 'Cihaziniz yonetici tarafindan engellendi.');
      for (const [rCode, rObj] of rooms.entries()) {
        if (rObj && rObj.deviceId === targetId) {
          closeRoomByCode(rCode);
        }
      }
    }
  } else if (action === 'toggle_vip' && typeof body.deviceId === 'string') {
    const targetId = body.deviceId.trim().toUpperCase();
    if (vipDevices.has(targetId)) {
      vipDevices.delete(targetId);
    } else {
      vipDevices.add(targetId);
      queueDeviceCommand(targetId, 'ALERT', 'Tebrikler! Hesabiniza VIP Altin Rozet tanimlandi.');
    }
  } else if (action === 'send_alert' && typeof body.deviceId === 'string') {
    const targetId = body.deviceId.trim().toUpperCase();
    const msgText = String(body.message || '').trim();
    if (msgText) {
      queueDeviceCommand(targetId, 'ALERT', msgText);
    }
  } else if (action === 'kick_device' && typeof body.deviceId === 'string') {
    const targetId = body.deviceId.trim().toUpperCase();
    queueDeviceCommand(targetId, 'KICK', String(body.message || 'Yonetici tarafindan odadan cikarildiniz.'));
    for (const [rCode, rObj] of rooms.entries()) {
      if (rObj && rObj.deviceId === targetId) {
        closeRoomByCode(rCode);
      }
    }
  } else if (action === 'admin_chat' && typeof body.text === 'string') {
    pushChatMessage('ADMIN', 'Turgut Efe', body.text, true);
  } else if (action === 'delete_chat' && typeof body.msgId === 'string') {
    deleteChatMessageById(body.msgId.trim());
  } else if (action === 'clear_chat') {
    lobbyChat.length = 0;
    pushChatMessage('ADMIN', 'Turgut Efe', 'Lobi sohbet gecmisi yonetici tarafindan temizlendi.', true);
  }

  purgeDeadEntries();
  const adminRooms = [];
  const onlineDeviceIds = new Set();

  for (const [code, roomObj] of rooms.entries()) {
    if (roomObj.deviceId) onlineDeviceIds.add(roomObj.deviceId);
    const g = games.get(code);
    const guestCount = roomObj.guests ? roomObj.guests.size : 0;
    adminRooms.push({
      code,
      hostId: roomObj.deviceId || 'AOH-000000',
      hostNick: g && g.parsed ? g.parsed.hostNick : 'Private Host',
      mapName: g && g.parsed ? g.parsed.mapName : 'Earth',
      scenarioName: g && g.parsed ? g.parsed.scenarioName : 'Private',
      turn: g && g.parsed ? g.parsed.turn : 1,
      players: g && g.parsed ? Math.max(g.parsed.players, 1 + guestCount) : (1 + guestCount),
      hasPass: g && g.parsed ? g.parsed.hasPass : true
    });
  }

  const now = Date.now();
  const devicesList = Array.from(deviceRegistry.values())
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 80)
    .map((d) => ({
      ...d,
      online: onlineDeviceIds.has(d.deviceId) || (now - d.lastSeen < 15000),
      banned: bannedDevices.has(d.deviceId),
      vip: vipDevices.has(d.deviceId)
    }));

  return {
    status: 200,
    data: {
      ok: true,
      state: serverState,
      stats: {
        activeRooms: rooms.size,
        publicRooms: games.size,
        totalDevices: deviceRegistry.size,
        uptimeSec: Math.floor((now - startTime) / 1000)
      },
      rooms: adminRooms,
      devices: devicesList,
      chat: lobbyChat.slice(-40)
    }
  };
}

module.exports = {
  ADMIN_PASS,
  serverState,
  bannedDevices,
  vipDevices,
  lobbyChat,
  resolvePermanentDeviceId,
  touchDevice,
  pushChatMessage,
  handleGameSync,
  handleAdminAction
};
