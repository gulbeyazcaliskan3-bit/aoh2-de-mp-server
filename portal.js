(function () {
  var cachedRooms = [];
  var cachedDevices = [];
  var cachedAdminChat = [];
  window._lastChatList = [];
  var adminToken = sessionStorage.getItem("turgut_admin_token") || "";
  sessionStorage.removeItem("turgut_admin_pass");
  var toastTimer = null;

  function trText(key) {
    return typeof window.t === "function" ? window.t(key) : key;
  }

  function escHtml(str) {
    return String(str == null ? "" : str)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;")
      .split("'").join("&#39;");
  }

  window.showToast = function (msg) {
    var box = document.getElementById("toastBox");
    if (!box) return;
    box.textContent = msg;
    box.style.display = "block";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.style.display = "none"; }, 3200);
  };

  function formatScenarioLabel(rawScenario, hostDeviceId, hostNick) {
    var clean = String(rawScenario == null ? "" : rawScenario).trim();
    if (clean && clean !== "0" && clean !== "-" && clean !== "Custom / Unknown" && clean !== "null" && clean !== "undefined") {
      return clean;
    }
    if (Array.isArray(cachedDevices)) {
      var targetId = String(hostDeviceId || "").trim().toUpperCase();
      var targetNick = String(hostNick || "").trim().toLowerCase();
      for (var i = 0; i < cachedDevices.length; i++) {
        var d = cachedDevices[i];
        if (!d) continue;
        var idMatch = targetId && targetId !== "-" && String(d.deviceId || "").toUpperCase() === targetId;
        var nickMatch = targetNick && String(d.nick || "").trim().toLowerCase() === targetNick;
        if (idMatch || nickMatch) {
          var devScen = String(d.scenario || "").trim();
          if (devScen && devScen !== "0" && devScen !== "-" && devScen !== "Custom / Unknown") {
            return devScen;
          }
        }
      }
    }
    return "Custom / Unknown";
  }

  window.renderRoomsTable = function () {
    var tbody = document.getElementById("roomsTableBody");
    var filterEl = document.getElementById("roomFilterInput");
    if (!tbody) return;

    var q = filterEl ? filterEl.value.trim().toLowerCase() : "";
    var filtered = cachedRooms.filter(function (r) {
      if (!q) return true;
      var scenText = formatScenarioLabel(r.scenario, r.hostDeviceId, r.host).toLowerCase();
      return String(r.name || "").toLowerCase().indexOf(q) !== -1 ||
        String(r.host || "").toLowerCase().indexOf(q) !== -1 ||
        String(r.map || "").toLowerCase().indexOf(q) !== -1 ||
        scenText.indexOf(q) !== -1 ||
        String(r.hostDeviceId || "").toLowerCase().indexOf(q) !== -1;
    });

    var statRoomsEl = document.getElementById("statRooms");
    if (statRoomsEl) statRoomsEl.textContent = String(cachedRooms.length);

    var totalPlayers = 0;
    var latestScen = "-";
    for (var i = 0; i < cachedRooms.length; i++) {
      var item = cachedRooms[i];
      totalPlayers += Math.max(1, Number(item.players) || 1);
      if (i === 0) latestScen = formatScenarioLabel(item.scenario, item.hostDeviceId, item.host);
    }

    var statPlayersEl = document.getElementById("statPlayers");
    if (statPlayersEl) statPlayersEl.textContent = String(totalPlayers);
    var statScenEl = document.getElementById("statScenario");
    if (statScenEl) statScenEl.textContent = latestScen;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">' + escHtml(trText("noRooms")) + "</td></tr>";
      return;
    }

    var html = "";
    for (var j = 0; j < filtered.length; j++) {
      var r = filtered[j];
      var scenarioDisplay = formatScenarioLabel(r.scenario, r.hostDeviceId, r.host);
      var vipTag = r.hostIsVip ? ' <span class="tag tag-gold">VIP</span>' : "";
      var lockIcon = r.hasPassword ? ' <span class="tag tag-red">' + escHtml(trText("locked")) + "</span>" : "";
      var statusTag = r.inGame
        ? '<span class="tag tag-gold">' + escHtml(trText("inGame")) + "</span>"
        : '<span class="tag tag-green">' + escHtml(trText("inLobby")) + "</span>";
      var hostIdTag = (r.hostDeviceId && r.hostDeviceId !== "-")
        ? ' <span style="color:var(--muted); font-size:10px;">(' + escHtml(r.hostDeviceId) + ")</span>"
        : "";

      html += "<tr>" +
        "<td><strong>" + escHtml(r.name || "Room") + "</strong>" + vipTag + lockIcon + "</td>" +
        "<td>" + escHtml(r.host || "Host") + hostIdTag + "</td>" +
        "<td>" + escHtml(r.map || "Earth") + "</td>" +
        "<td><span class='tag'>" + escHtml(scenarioDisplay) + "</span></td>" +
        "<td><strong>" + escHtml(r.players || 1) + "</strong> / " + escHtml(r.maxPlayers || 8) + "</td>" +
        "<td>" + (r.turn > 0 ? (escHtml(trText("thTurn")) + " " + escHtml(r.turn)) : escHtml(trText("inLobby"))) + "</td>" +
        "<td>" + statusTag + "</td>" +
      "</tr>";
    }
    tbody.innerHTML = html;
  };

  window.renderPublicChat = function (chatList) {
    window._lastChatList = Array.isArray(chatList) ? chatList : [];
    var box = document.getElementById("publicChatBox");
    if (!box) return;

    if (window._lastChatList.length === 0) {
      box.innerHTML = '<div class="empty-state">' + escHtml(trText("noChat")) + "</div>";
      return;
    }

    var wasAtBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) <= 45;
    var html = "";
    for (var i = 0; i < window._lastChatList.length; i++) {
      var m = window._lastChatList[i];
      if (!m) continue;
      var timeStr = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      var badgeHtml = "";
      var nameClass = "";
      if (m.isAdmin) {
        badgeHtml = '<span class="tag tag-gold" style="margin-right:4px;">ADMIN</span>';
        nameClass = "chat-admin";
      } else if (m.isVip) {
        badgeHtml = '<span class="tag tag-green" style="margin-right:4px;">VIP</span>';
        nameClass = "chat-vip";
      }
      var delBtn = adminToken && m.id
        ? ' <button class="btn btn-xs btn-danger" style="height:15px; padding:0 4px; font-size:8.5px; margin-left:4px;" data-del-id="' + escHtml(m.id) + '" onclick="window.deleteChatMsg(this)">×</button>'
        : "";
      html += '<div class="chat-line">' +
        '<span class="chat-time">[' + escHtml(timeStr) + "]</span>" +
        badgeHtml +
        '<span class="' + nameClass + '">' + escHtml(m.nick || "Player") + ":</span> " +
        "<span>" + escHtml(m.text || "") + "</span>" +
        delBtn +
      "</div>";
    }
    box.innerHTML = html;
    if (wasAtBottom) box.scrollTop = box.scrollHeight;
  };

  window.sendPublicChat = async function () {
    var nickEl = document.getElementById("webNickInput");
    var textEl = document.getElementById("webChatInput");
    if (!textEl) return;
    var text = textEl.value.trim();
    if (!text) return;

    var nick = (nickEl && nickEl.value.trim()) ? nickEl.value.trim() : "WebPlayer";
    localStorage.setItem("turgut_web_nick", nick);
    textEl.value = "";

    try {
      var headers = { "Content-Type": "application/json" };
      if (adminToken) headers["X-Admin-Token"] = adminToken;
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          deviceId: adminToken ? "ADMIN" : ("WEB-" + nick.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)),
          nick: adminToken ? "Turgut Efe" : nick,
          text: text
        })
      });
      var data = await res.json();
      if (res.status === 403) return window.showToast("Muted / Banned");
      if (res.status === 429) return window.showToast("Slow down");
      if (data && data.ok && Array.isArray(data.chat)) {
        window.renderPublicChat(data.chat);
        if (adminToken) window.refreshAdminState(false);
      } else {
        window.showToast("Message failed.");
      }
    } catch (e) {
      window.showToast("Connection error.");
    }
  };

  window.refreshAll = async function (manual) {
    var t0 = performance.now();
    try {
      var results = await Promise.all([fetch("/api/rooms"), fetch("/api/chat")]);
      var roomsData = await results[0].json();
      var chatData = await results[1].json();
      var ms = Math.max(1, Math.round(performance.now() - t0));

      var pingEl = document.getElementById("statPing");
      if (pingEl) pingEl.textContent = ms + " ms";
      var syncBadge = document.getElementById("lastSyncBadge");
      if (syncBadge) syncBadge.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      if (roomsData && roomsData.ok) {
        cachedRooms = Array.isArray(roomsData.rooms) ? roomsData.rooms : [];
        if (roomsData.announcement) {
          var annEl = document.getElementById("globalAnnouncement");
          if (annEl) annEl.textContent = roomsData.announcement;
        }
        window.renderRoomsTable();
      }
      if (chatData && chatData.ok && Array.isArray(chatData.chat)) {
        window.renderPublicChat(chatData.chat);
      }
      if (manual) window.showToast("OK (" + ms + " ms)");
    } catch (e) {
      var pingEl2 = document.getElementById("statPing");
      if (pingEl2) pingEl2.textContent = "Connecting...";
    }
  };

  window.openAdminAuth = function () {
    if (adminToken) {
      var sec = document.getElementById("adminSection");
      if (sec) sec.classList.toggle("active");
      window.refreshAdminState(false);
      return;
    }
    var modal = document.getElementById("adminModal");
    if (modal) modal.classList.add("open");
    var inp = document.getElementById("adminPassInput");
    if (inp) {
      inp.value = "";
      setTimeout(function () { inp.focus(); }, 60);
    }
  };

  window.closeAdminModal = function () {
    var modal = document.getElementById("adminModal");
    if (modal) modal.classList.remove("open");
  };

  window.confirmAdminLogin = async function () {
    var inp = document.getElementById("adminPassInput");
    var pass = inp ? inp.value.trim() : "";
    if (!pass) return window.showToast("Password required.");

    try {
      var res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
      });
      var data = await res.json();
      if (!data || !data.ok || !data.token) {
        return window.showToast("Invalid password!");
      }
      adminToken = data.token;
      sessionStorage.setItem("turgut_admin_token", adminToken);
      window.closeAdminModal();

      var sec = document.getElementById("adminSection");
      if (sec) sec.classList.add("active");
      var btn = document.getElementById("btnToggleAdmin");
      if (btn) btn.textContent = trText("adminPanel");

      await window.refreshAdminState(false);
      window.renderPublicChat(window._lastChatList);
      window.showToast("Admin OK!");
    } catch (e) {
      window.showToast("Server error.");
    }
  };

  window.logoutAdmin = function (expired) {
    adminToken = "";
    sessionStorage.removeItem("turgut_admin_token");
    var sec = document.getElementById("adminSection");
    if (sec) sec.classList.remove("active");
    var btn = document.getElementById("btnToggleAdmin");
    if (btn) btn.textContent = trText("adminLogin");
    window.renderPublicChat(window._lastChatList);
    window.showToast(expired ? trText("sessionExpired") : "Logged out.");
  };

  window.selectDeviceForAction = function (el) {
    var deviceId = el ? el.getAttribute("data-id") : "";
    var inp = document.getElementById("targetDeviceIdInput");
    if (inp && deviceId) {
      inp.value = deviceId;
      inp.focus();
      window.showToast("ID: " + deviceId);
    }
  };

  window.renderAdminRoomsTable = function () {
    var tbody = document.getElementById("adminRoomsBody");
    var badge = document.getElementById("adminRoomCount");
    if (badge) badge.textContent = cachedRooms.length + trText("roomsCountSuffix");
    if (!tbody) return;
    if (cachedRooms.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">' + escHtml(trText("noRooms")) + "</td></tr>";
      return;
    }
    var html = "";
    for (var i = 0; i < cachedRooms.length; i++) {
      var r = cachedRooms[i];
      var code = escHtml(r.id || "");
      html += "<tr>" +
        "<td><strong>" + code + "</strong></td>" +
        "<td>" + escHtml(r.host || "Host") + " <span style='color:var(--muted); font-size:10px;'>(" + escHtml(r.hostDeviceId || "-") + ")</span></td>" +
        "<td>" + escHtml(r.map || "Earth") + " • " + escHtml(r.scenario || "-") + "</td>" +
        "<td>" + escHtml(r.players || 1) + " (" + (r.turn > 0 ? ("T" + escHtml(r.turn)) : escHtml(trText("inLobby"))) + ")</td>" +
        "<td><button class='btn btn-xs btn-danger' data-code='" + code + "' onclick='window.adminCloseRoom(this)'>" + escHtml(trText("closeRoomBtn")) + "</button></td>" +
      "</tr>";
    }
    tbody.innerHTML = html;
  };

  window.renderAdminChatTable = function () {
    var tbody = document.getElementById("adminChatBody");
    if (!tbody) return;
    if (!Array.isArray(cachedAdminChat) || cachedAdminChat.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-state">' + escHtml(trText("noChatMod")) + "</td></tr>";
      return;
    }
    var recent = cachedAdminChat.slice(-20).reverse();
    var html = "";
    for (var i = 0; i < recent.length; i++) {
      var m = recent[i];
      var devId = escHtml(m.deviceId || "");
      var msgId = escHtml(m.id || "");
      var muteBtn = (devId && devId !== "ADMIN" && devId !== "SYSTEM")
        ? " <button class='btn btn-xs btn-info' data-act='MUTE' data-id='" + devId + "' onclick='window.handleRowBtn(this)'>" + escHtml(trText("muteBtn")) + "</button>"
        : "";
      html += "<tr>" +
        "<td><strong>" + escHtml(m.nick || "Player") + "</strong> <span style='color:var(--muted); font-size:9.5px;'>(" + devId + ")</span></td>" +
        "<td style='word-break:break-word;'>" + escHtml(m.text || "") + "</td>" +
        "<td style='white-space:nowrap;'>" +
          "<button class='btn btn-xs btn-danger' data-del-id='" + msgId + "' onclick='window.deleteChatMsg(this)'>" + escHtml(trText("delMsgBtn")) + "</button>" +
          muteBtn +
        "</td>" +
      "</tr>";
    }
    tbody.innerHTML = html;
  };

  window.renderDevicesTable = function () {
    var tbody = document.getElementById("adminDevicesBody");
    var countBadge = document.getElementById("adminDeviceCount");
    var searchEl = document.getElementById("deviceSearchInput");
    if (countBadge) countBadge.textContent = cachedDevices.length + trText("devicesCountSuffix");
    if (!tbody) return;

    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var filtered = cachedDevices.filter(function (d) {
      if (!q) return true;
      return String(d.deviceId || "").toLowerCase().indexOf(q) !== -1 ||
        String(d.nick || "").toLowerCase().indexOf(q) !== -1 ||
        String(d.screen || "").toLowerCase().indexOf(q) !== -1 ||
        String(d.scenario || "").toLowerCase().indexOf(q) !== -1;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">' + escHtml(trText("noDevices")) + "</td></tr>";
      return;
    }

    var html = "";
    for (var i = 0; i < filtered.length; i++) {
      var d = filtered[i];
      var statusHtml = d.online
        ? '<span class="tag tag-green">' + escHtml(trText("online")) + "</span>"
        : '<span class="tag">' + escHtml(trText("offline")) + "</span>";
      var roleHtml = '<span class="tag">' + escHtml(trText("standard")) + "</span>";
      if (d.isBanned) roleHtml = '<span class="tag tag-red">' + escHtml(trText("banned")) + "</span>";
      else if (d.isMuted) roleHtml = '<span class="tag tag-red">' + escHtml(trText("muted")) + "</span>";
      else if (d.isVip) roleHtml = '<span class="tag tag-gold">VIP</span>';

      var safeId = escHtml(d.deviceId || "");
      var banBtn = d.isBanned
        ? '<button class="btn btn-xs btn-ok" data-act="UNBAN" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("unbanBtn")) + "</button>"
        : '<button class="btn btn-xs btn-danger" data-act="BAN" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("banBtn")) + "</button>";
      var muteBtn = d.isMuted
        ? '<button class="btn btn-xs btn-ok" data-act="UNMUTE" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("unmuteBtn")) + "</button>"
        : '<button class="btn btn-xs btn-info" data-act="MUTE" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("muteBtn")) + "</button>";

      html += "<tr>" +
        "<td>" + statusHtml + "</td>" +
        "<td><strong style='color:var(--gold); cursor:pointer;' data-id='" + safeId + "' onclick='window.selectDeviceForAction(this)'>" + safeId + "</strong></td>" +
        "<td>" + escHtml(d.nick || "Player") + "</td>" +
        "<td><span class='tag'>" + escHtml(d.screen || "MAIN_MENU") + "</span></td>" +
        "<td>" + escHtml(formatScenarioLabel(d.scenario, d.deviceId, d.nick)) + "</td>" +
        "<td>" + roleHtml + "</td>" +
        "<td><div class='device-actions'>" +
          '<button class="btn btn-xs btn-gold" data-act="WARN" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("warnBtn")) + "</button>" +
          '<button class="btn btn-xs btn-info" data-act="KICK" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("kickBtn")) + "</button>" +
          muteBtn + banBtn +
          '<button class="btn btn-xs" data-act="VIP" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">VIP</button>' +
        "</div></td>" +
      "</tr>";
    }
    tbody.innerHTML = html;
  };

  window.handleRowBtn = function (btn) {
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    var devId = btn.getAttribute("data-id");
    if (act && devId) window.quickDeviceAction(act, devId);
  };

  async function postAdminAction(payload) {
    if (!adminToken) {
      window.showToast("Admin login required.");
      return false;
    }
    try {
      var res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        window.logoutAdmin(true);
        return false;
      }
      var data = await res.json();
      if (data && data.ok) {
        await window.refreshAdminState(false);
        await window.refreshAll(false);
        return true;
      }
      window.showToast("Action failed.");
      return false;
    } catch (e) {
      window.showToast("Server error.");
      return false;
    }
  }

  window.sendAdminAnnounce = async function () {
    var inp = document.getElementById("adminAnnounceInput");
    var message = inp ? inp.value.trim() : "";
    if (!message) return window.showToast("Enter announcement.");
    if (await postAdminAction({ action: "ANNOUNCE", message: message })) {
      inp.value = "";
      window.showToast("Published!");
    }
  };

  window.sendAdminDirectChat = async function () {
    var inp = document.getElementById("adminDirectChatInput");
    var message = inp ? inp.value.trim() : "";
    if (!message) return;
    if (await postAdminAction({ action: "ADMIN_CHAT", message: message })) {
      inp.value = "";
      window.showToast("Sent as ADMIN!");
    }
  };

  window.runTargetedCommand = async function (action) {
    var idInp = document.getElementById("targetDeviceIdInput");
    var msgInp = document.getElementById("targetMessageInput");
    var deviceId = idInp ? idInp.value.trim().toUpperCase() : "";
    var message = msgInp ? msgInp.value.trim() : "";
    if (!deviceId) return window.showToast("Enter Device ID.");
    if (await postAdminAction({ action: action, deviceId: deviceId, message: message })) {
      if (msgInp) msgInp.value = "";
      window.showToast(deviceId + " -> " + action + " OK");
    }
  };

  window.quickDeviceAction = async function (action, deviceId) {
    var message = "";
    if (action === "WARN") {
      var custom = prompt(deviceId + " -> Warning message:", "Official warning from Administrator Turgut Efe.");
      if (custom === null) return;
      message = custom.trim();
    } else if (action === "BAN") {
      if (!confirm(deviceId + " -> Permanent Ban?")) return;
      message = "Your device (" + deviceId + ") has been banned by Administrator Turgut Efe.";
    }
    if (await postAdminAction({ action: action, deviceId: deviceId, message: message })) {
      window.showToast(deviceId + " -> " + action + " OK");
    }
  };

  window.adminCloseRoom = async function (btn) {
    var code = btn ? btn.getAttribute("data-code") : "";
    if (!code || !confirm(trText("confirmCloseRoom") + " (" + code + ")")) return;
    if (await postAdminAction({ action: "CLOSE_ROOM", code: code })) {
      window.showToast("Room " + code + " closed");
    }
  };

  window.deleteChatMsg = async function (btn) {
    var msgId = btn ? btn.getAttribute("data-del-id") : "";
    if (!msgId) return;
    if (await postAdminAction({ action: "DELETE_CHAT", msgId: msgId })) {
      window.showToast("Deleted");
    }
  };

  window.adminClearChat = async function () {
    if (!confirm(trText("confirmClearChat"))) return;
    if (await postAdminAction({ action: "CLEAR_CHAT" })) {
      window.showToast("Chat cleared!");
    }
  };

  window.refreshAdminState = async function (manual) {
    if (!adminToken) return;
    try {
      var res = await fetch("/api/admin/state", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
        body: "{}"
      });
      if (res.status === 401) {
        window.logoutAdmin(true);
        return;
      }
      var data = await res.json();
      if (data && data.ok) {
        cachedDevices = Array.isArray(data.devices) ? data.devices : [];
        if (Array.isArray(data.rooms)) cachedRooms = data.rooms;
        cachedAdminChat = Array.isArray(data.chat) ? data.chat : [];
        window.renderDevicesTable();
        window.renderRoomsTable();
        window.renderAdminRoomsTable();
        window.renderAdminChatTable();
        if (manual) window.showToast("Admin synced!");
      }
    } catch (e) {}
  };

  window.addEventListener("DOMContentLoaded", function () {
    if (typeof window.setLanguage === "function") {
      window.setLanguage(window.currentLang || "tr");
    }
    var savedNick = localStorage.getItem("turgut_web_nick");
    var nickInp = document.getElementById("webNickInput");
    if (savedNick && nickInp) nickInp.value = savedNick;

    if (adminToken) {
      var sec = document.getElementById("adminSection");
      if (sec) sec.classList.add("active");
      var btn = document.getElementById("btnToggleAdmin");
      if (btn) btn.textContent = trText("adminPanel");
      window.refreshAdminState(false);
    }

    window.refreshAll(false);
    setInterval(function () { window.refreshAll(false); }, 3500);
    setInterval(function () {
      if (adminToken) window.refreshAdminState(false);
    }, 4500);
  });
})();
