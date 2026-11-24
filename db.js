const crypto = require("crypto");

const DEVICE_OFFLINE_MS = 25000;
const DM_COOLDOWN_MS = 900;
const INVITE_TTL_MS = 5 * 60 * 1000;
const MAX_FRIENDS = 100;
const lastDmTs = new Map();

function makePairKey(id1, id2) {
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
}

function createSocialModule(ctx) {
  const { db, getDevices, getBannedIds, getMutedIds, getVipIds, getRooms, getGames, sanitizeText, normalizeDeviceId, sendJson, readJsonBody } = ctx;

  function findRoomForDevice(deviceId) {
    const rooms = getRooms();
    const games = getGames();
    for (const [code, rObj] of rooms.entries()) {
      if (rObj && rObj.deviceId === deviceId && rObj.ws && rObj.ws.readyState === 1) {
        const g = games.get(code);
        return {
          roomCode: code,
          inGame: Boolean(g && g.parsed && g.parsed.turn > 0),
          mapName: (g && g.parsed && g.parsed.mapName) || "Earth",
          scenarioName: (g && g.parsed && g.parsed.scenarioName) || "-"
        };
      }
    }
    return null;
  }

  function formatFriendPresence(peerDev, unreadCount) {
    const now = Date.now();
    const isActuallyOnline = Boolean(peerDev && (now - peerDev.lastSeen) < DEVICE_OFFLINE_MS);
    const visibleOnline = isActuallyOnline && !peerDev.appearOffline;
    const roomInfo = visibleOnline ? findRoomForDevice(peerDev.deviceId) : null;

    let activity = "Offline";
    if (visibleOnline) {
      if (roomInfo) {
        activity = roomInfo.inGame
          ? `In Game (${roomInfo.scenarioName !== "-" ? roomInfo.scenarioName : roomInfo.mapName})`
          : `In MP Lobby [${roomInfo.roomCode}]`;
      } else if (peerDev.screen === "IN_GAME") {
        activity = peerDev.scenario && peerDev.scenario !== "-" ? `Playing: ${peerDev.scenario}` : "In Game";
      } else if (peerDev.screen === "MP_LOBBY") {
        activity = "In Multiplayer Menu";
      } else {
        activity = "In Main Menu";
      }
    }

    return {
      deviceId: peerDev.deviceId,
      nick: peerDev.nick || "Player",
      isVip: getVipIds().has(peerDev.deviceId),
      online: visibleOnline,
      activity,
      screen: visibleOnline ? peerDev.screen : "OFFLINE",
      scenario: visibleOnline ? (peerDev.scenario || "-") : "-",
      roomCode: roomInfo ? roomInfo.roomCode : "-",
      unreadCount: unreadCount || 0
    };
  }

  function resolveTargetDevice(targetRaw) {
    const devices = getDevices();
    const norm = normalizeDeviceId(targetRaw);
    if (norm.startsWith("AOH-") && devices.has(norm)) {
      return { dev: devices.get(norm), error: null };
    }
    const cleanNick = sanitizeText(targetRaw || "", 24).toLowerCase();
    if (!cleanNick) return { dev: null, error: "Enter a Device ID or nickname." };

    const matches = [];
    for (const dev of devices.values()) {
      if (dev.nick && dev.nick.trim().toLowerCase() === cleanNick) matches.push(dev);
    }
    if (matches.length === 0) return { dev: null, error: "Player not found." };
    if (matches.length > 1) return { dev: null, error: "Multiple players share that nick. Use Device ID." };
    return { dev: matches[0], error: null };
  }

  async function getSyncBadges(deviceId) {
    const now = Date.now();
    const [rows, unreadMap, invites] = await Promise.all([
      db.getFriendshipsFor(deviceId),
      db.getUnreadCountsBySender(deviceId),
      db.getActiveInvitesFor(deviceId, now)
    ]);
    let pendingFriends = 0;
    for (const r of rows) {
      if (r.status === "PENDING" && r.requesterId !== deviceId) pendingFriends++;
    }
    let unreadDms = 0;
    for (const cnt of unreadMap.values()) unreadDms += cnt;
    return { pendingFriends, unreadDms, invites };
  }

  async function handleSocialRequest(req, res, pathname) {
    if (!pathname.startsWith("/api/profile/") && !pathname.startsWith("/api/friends/") && !pathname.startsWith("/api/dm/") && !pathname.startsWith("/api/invite/")) {
      return false;
    }
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return true;
    }

    const body = await readJsonBody(req);
    const deviceId = normalizeDeviceId(body.deviceId);
    const devices = getDevices();
    if (!deviceId || !deviceId.startsWith("AOH-")) {
      sendJson(res, 400, { ok: false, error: "Invalid Device ID" });
      return true;
    }
    if (getBannedIds().has(deviceId)) {
      sendJson(res, 403, { ok: false, error: "Device is banned" });
      return true;
    }

    if (pathname === "/api/profile/update") {
      const now = Date.now();
      const prev = devices.get(deviceId) || {
        deviceId, nick: "Player", screen: "MAIN_MENU", scenario: "-",
        ipHash: "", isVip: getVipIds().has(deviceId), isBanned: false, isMuted: getMutedIds().has(deviceId),
        banReason: "", appearOffline: false, bio: "", firstSeen: now, lastSeen: now
      };
      if (typeof body.appearOffline === "boolean") prev.appearOffline = body.appearOffline;
      if (typeof body.bio === "string") prev.bio = sanitizeText(body.bio, 80);
      if (typeof body.nick === "string") {
        const cleanNick = sanitizeText(body.nick, 24);
        if (cleanNick.length >= 2) prev.nick = cleanNick;
      }
      prev.lastSeen = now;
      devices.set(deviceId, prev);
      await db.saveDeviceNow(prev);
      sendJson(res, 200, {
        ok: true,
        profile: {
          deviceId: prev.deviceId,
          nick: prev.nick,
          isVip: prev.isVip,
          isMuted: prev.isMuted,
          appearOffline: prev.appearOffline,
          bio: prev.bio
        }
      });
      return true;
    }

    if (pathname === "/api/friends/list") {
      const now = Date.now();
      const [rows, unreadMap, invites] = await Promise.all([
        db.getFriendshipsFor(deviceId),
        db.getUnreadCountsBySender(deviceId),
        db.getActiveInvitesFor(deviceId, now)
      ]);

      const friends = [];
      const incoming = [];
      const outgoing = [];

      for (const r of rows) {
        const peerId = r.userA === deviceId ? r.userB : r.userA;
        const peerDev = devices.get(peerId) || {
          deviceId: peerId, nick: "Player", screen: "OFFLINE", scenario: "-", appearOffline: false, lastSeen: 0
        };
        if (r.status === "ACCEPTED") {
          friends.push(formatFriendPresence(peerDev, unreadMap.get(peerId) || 0));
        } else if (r.status === "PENDING") {
          const item = { pairKey: r.pairKey, deviceId: peerId, nick: peerDev.nick || "Player", isVip: getVipIds().has(peerId), createdAt: r.createdAt };
          if (r.requesterId === deviceId) outgoing.push(item);
          else incoming.push(item);
        }
      }

      friends.sort((a, b) => Number(b.online) - Number(a.online) || a.nick.localeCompare(b.nick));
      const me = devices.get(deviceId);
      sendJson(res, 200, {
        ok: true,
        profile: {
          deviceId,
          nick: (me && me.nick) || "Player",
          isVip: getVipIds().has(deviceId),
          isMuted: getMutedIds().has(deviceId),
          appearOffline: Boolean(me && me.appearOffline),
          bio: (me && me.bio) || ""
        },
        friends,
        incoming,
        outgoing,
        invites
      });
      return true;
    }

    if (pathname === "/api/friends/request") {
      const resolved = resolveTargetDevice(body.target);
      if (!resolved.dev) {
        sendJson(res, 404, { ok: false, error: resolved.error });
        return true;
      }
      const peerId = resolved.dev.deviceId;
      if (peerId === deviceId) {
        sendJson(res, 400, { ok: false, error: "You cannot add yourself." });
        return true;
      }
      if (getBannedIds().has(peerId)) {
        sendJson(res, 403, { ok: false, error: "Target player is banned." });
        return true;
      }

      const existingList = await db.getFriendshipsFor(deviceId);
      if (existingList.length >= MAX_FRIENDS) {
        sendJson(res, 400, { ok: false, error: "Friend list limit reached." });
        return true;
      }

      const pairKey = makePairKey(deviceId, peerId);
      const existing = await db.getFriendshipPair(pairKey);
      const now = Date.now();
      const [userA, userB] = deviceId < peerId ? [deviceId, peerId] : [peerId, deviceId];

      if (existing) {
        if (existing.status === "ACCEPTED") {
          sendJson(res, 200, { ok: true, status: "ALREADY_FRIENDS", message: "Already friends." });
          return true;
        }
        if (existing.requesterId !== deviceId) {
          await db.upsertFriendship({ pairKey, userA, userB, requesterId: existing.requesterId, status: "ACCEPTED", createdAt: existing.createdAt, updatedAt: now });
          sendJson(res, 200, { ok: true, status: "ACCEPTED", message: "Friend request accepted." });
          return true;
        }
        sendJson(res, 200, { ok: true, status: "PENDING", message: "Request already sent." });
        return true;
      }

      await db.upsertFriendship({ pairKey, userA, userB, requesterId: deviceId, status: "PENDING", createdAt: now, updatedAt: now });
      sendJson(res, 200, { ok: true, status: "PENDING", message: "Friend request sent." });
      return true;
    }

    if (pathname === "/api/friends/respond") {
      const peerId = normalizeDeviceId(body.peerId);
      const accept = Boolean(body.accept);
      if (!peerId) {
        sendJson(res, 400, { ok: false, error: "Missing peerId" });
        return true;
      }
      const pairKey = makePairKey(deviceId, peerId);
      const existing = await db.getFriendshipPair(pairKey);
      if (!existing || existing.status !== "PENDING" || existing.requesterId === deviceId) {
        sendJson(res, 404, { ok: false, error: "Pending request not found." });
        return true;
      }
      if (accept) {
        await db.upsertFriendship({ ...existing, status: "ACCEPTED", updatedAt: Date.now() });
        sendJson(res, 200, { ok: true, status: "ACCEPTED" });
      } else {
        await db.deleteFriendship(pairKey);
        sendJson(res, 200, { ok: true, status: "DECLINED" });
      }
      return true;
    }

    if (pathname === "/api/friends/remove") {
      const peerId = normalizeDeviceId(body.peerId);
      if (!peerId) {
        sendJson(res, 400, { ok: false, error: "Missing peerId" });
        return true;
      }
      await db.deleteFriendship(makePairKey(deviceId, peerId));
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/dm/thread") {
      const peerId = normalizeDeviceId(body.peerId);
      if (!peerId) {
        sendJson(res, 400, { ok: false, error: "Missing peerId" });
        return true;
      }
      const pairKey = makePairKey(deviceId, peerId);
      const fr = await db.getFriendshipPair(pairKey);
      if (!fr || fr.status !== "ACCEPTED") {
        sendJson(res, 403, { ok: false, error: "You can only message accepted friends." });
        return true;
      }
      await db.markThreadRead(pairKey, deviceId);
      const messages = await db.getDirectThread(pairKey, 50);
      sendJson(res, 200, { ok: true, messages });
      return true;
    }

    if (pathname === "/api/dm/send") {
      if (getMutedIds().has(deviceId)) {
        sendJson(res, 403, { ok: false, error: "Your account is muted." });
        return true;
      }
      if (!getVipIds().has(deviceId)) {
        const prevTs = lastDmTs.get(deviceId) || 0;
        if (Date.now() - prevTs < DM_COOLDOWN_MS) {
          sendJson(res, 429, { ok: false, error: "Slow down." });
          return true;
        }
        lastDmTs.set(deviceId, Date.now());
      }

      const peerId = normalizeDeviceId(body.peerId);
      const text = sanitizeText(body.text || "", 240);
      if (!peerId || !text) {
        sendJson(res, 400, { ok: false, error: "Invalid message" });
        return true;
      }
      const pairKey = makePairKey(deviceId, peerId);
      const fr = await db.getFriendshipPair(pairKey);
      if (!fr || fr.status !== "ACCEPTED") {
        sendJson(res, 403, { ok: false, error: "You can only message accepted friends." });
        return true;
      }

      const me = devices.get(deviceId);
      const msg = {
        id: "dm-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
        pairKey,
        fromId: deviceId,
        toId: peerId,
        fromNick: (me && me.nick) || "Player",
        text,
        ts: Date.now()
      };
      await db.insertDirectMessage(msg);
      const messages = await db.getDirectThread(pairKey, 50);
      sendJson(res, 200, { ok: true, messages });
      return true;
    }

    if (pathname === "/api/invite/send") {
      const peerId = normalizeDeviceId(body.peerId);
      const roomCode = sanitizeText(body.roomCode || "", 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!peerId || !/^[A-Z0-9]{6}$/.test(roomCode)) {
        sendJson(res, 400, { ok: false, error: "Valid 6-character room code required." });
        return true;
      }
      const pairKey = makePairKey(deviceId, peerId);
      const fr = await db.getFriendshipPair(pairKey);
      if (!fr || fr.status !== "ACCEPTED") {
        sendJson(res, 403, { ok: false, error: "You can only invite friends." });
        return true;
      }

      const me = devices.get(deviceId);
      const roomInfo = findRoomForDevice(deviceId);
      const now = Date.now();
      await db.insertRoomInvite({
        id: "inv-" + deviceId + "-" + peerId,
        fromId: deviceId,
        toId: peerId,
        fromNick: (me && me.nick) || "Player",
        roomCode,
        hasPass: Boolean(body.hasPass),
        mapName: sanitizeText(body.mapName || (roomInfo && roomInfo.mapName) || "Earth", 48),
        scenarioName: sanitizeText(body.scenarioName || (roomInfo && roomInfo.scenarioName) || "-", 64),
        createdAt: now,
        expiresAt: now + INVITE_TTL_MS
      });
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/invite/respond") {
      const inviteId = sanitizeText(body.inviteId || "", 64);
      if (inviteId) await db.deleteRoomInvite(inviteId);
      sendJson(res, 200, { ok: true });
      return true;
    }

    return false;
  }

  return { handleSocialRequest, getSyncBadges };
}

module.exports = { createSocialModule };
