(function () {
  var cachedRooms = [];
  var cachedDevices = [];
  var adminPass = sessionStorage.getItem("turgut_admin_pass") || "";
  var toastTimer = null;

  var DEFAULT_SCENARIOS = {
    "0": "Modern World",
    "1": "1440",
    "2": "World War II",
    "3": "1200",
    "4": "Victorian Era",
    "5": "5",
    "6": "1440 - Alternate",
    "7": "World War I"
  };

  function trText(key) {
    if (typeof window.t === "function") {
      return window.t(key);
    }
    return key;
  }

  function escHtml(str) {
    var s = String(str == null ? "" : str);
    return s
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
    toastTimer = setTimeout(function () {
      box.style.display = "none";
    }, 3200);
  };

  function formatScenarioLabel(rawScenario, hostDeviceId, hostNick) {
    var clean = String(rawScenario == null ? "" : rawScenario).trim();
    if (clean && clean !== "0" && clean !== "-" && clean !== "null" && clean !== "undefined") {
      return DEFAULT_SCENARIOS[clean] || clean;
    }

    if (Array.isArray(cachedDevices) && cachedDevices.length > 0) {
      var targetId = String(hostDeviceId || "").trim().toUpperCase();
      var targetNick = String(hostNick || "").trim().toLowerCase();
      for (var i = 0; cachedDevices.length > i; i++) {
        var d = cachedDevices[i];
        if (!d) continue;
        var idMatch = targetId && targetId !== "-" && String(d.deviceId || "").toUpperCase() === targetId;
        var nickMatch = targetNick && String(d.nick || "").trim().toLowerCase() === targetNick;
        if (idMatch || nickMatch) {
          var devScen = String(d.scenario || "").trim();
          if (devScen && devScen !== "0" && devScen !== "-") {
            return DEFAULT_SCENARIOS[devScen] || devScen;
          }
        }
      }
    }

    return clean === "0" ? "Modern World" : "Custom Scenario";
  }

  window.renderRoomsTable = function () {
    var tbody = document.getElementById("roomsTableBody");
    var filterEl = document.getElementById("roomFilterInput");
    if (!tbody) return;

    var q = filterEl ? filterEl.value.trim().toLowerCase() : "";
    var filtered = cachedRooms.filter(function (r) {
      if (!q) return true;
      var scenText = formatScenarioLabel(r.scenario, r.hostDeviceId, r.host).toLowerCase();
      var nameText = String(r.name || "").toLowerCase();
      var hostText = String(r.host || "").toLowerCase();
      var idText = String(r.hostDeviceId || "").toLowerCase();
      return nameText.indexOf(q) !== -1 || hostText.indexOf(q) !== -1 || scenText.indexOf(q) !== -1 || idText.indexOf(q) !== -1;
    });

    var statRoomsEl = document.getElementById("statRooms");
    if (statRoomsEl) statRoomsEl.textContent = String(cachedRooms.length);

    var totalPlayers = 0;
    var latestScen = "Modern World";
    for (var i = 0; cachedRooms.length > i; i++) {
      var item = cachedRooms[i];
      totalPlayers += Math.max(1, Number(item.players) || 1);
      latestScen = formatScenarioLabel(item.scenario, item.hostDeviceId, item.host);
    }

    var statPlayersEl = document.getElementById("statPlayers");
    if (statPlayersEl) statPlayersEl.textContent = String(totalPlayers);

    var statScenEl = document.getElementById("statScenario");
    if (statScenEl) statScenEl.textContent = latestScen;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">' + escHtml(trText("noRooms")) + '</td></tr>';
      return;
    }

    var html = "";
    for (var j = 0; filtered.length > j; j++) {
      var r = filtered[j];
      var scenarioDisplay = formatScenarioLabel(r.scenario, r.hostDeviceId, r.host);
      var lockIcon = r.hasPassword ? ' <span class="tag tag-gold">' + escHtml(trText("locked")) + '</span>' : "";
      var statusTag = r.inGame
        ? '<span class="tag tag-gold">' + escHtml(trText("inGame")) + '</span>'
        : '<span class="tag tag-green">' + escHtml(trText("inLobby")) + '</span>';
      var hostIdTag = (r.hostDeviceId && r.hostDeviceId !== "-")
        ? ' <span style="color:var(--muted); font-size:10px;">(' + escHtml(r.hostDeviceId) + ')</span>'
        : "";

      html += "<tr>" +
        "<td><strong>" + escHtml(r.name || "Room") + "</strong>" + lockIcon + "</td>" +
        "<td>" + escHtml(r.host || "Host") + hostIdTag + "</td>" +
        "<td>" + escHtml(r.map || "Earth") + "</td>" +
        "<td><span class='tag'>" + escHtml(scenarioDisplay) + "</span></td>" +
        "<td><strong>" + escHtml(r.players || 1) + "</strong> / " + escHtml(r.maxPlayers || 8) + "</td>" +
        "<td>" + escHtml(trText("thTurn")) + " " + escHtml(r.turn || 1) + "</td>" +
        "<td>" + statusTag + "</td>" +
      "</tr>";
    }
    tbody.innerHTML = html;
  };
  window.renderPublicChat = function (chatList) {
    var box = document.getElementById("publicChatBox");
    if (!box) return;

    if (!Array.isArray(chatList) || chatList.length === 0) {
      box.innerHTML = '<div class="empty-state">' + escHtml(trText("noChat")) + '</div>';
      return;
    }

    var wasAtBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) <= 45;
    var html = "";

    for (var i = 0; chatList.length > i; i++) {
      var m = chatList[i];
      if (!m) continue;
      var timeStr = m.ts
        ? new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      var badgeHtml = "";
      var nameClass = "";
      if (m.isAdmin) {
        badgeHtml = '<span class="tag tag-gold" style="margin-right:4px;">ADMIN</span>';
        nameClass = "chat-admin";
      } else if (m.isVip) {
        badgeHtml = '<span class="tag tag-green" style="margin-right:4px;">VIP</span>';
        nameClass = "chat-vip";
      }

      html += '<div class="chat-line">' +
        '<span class="chat-time">[' + escHtml(timeStr) + ']</span>' +
        badgeHtml +
        '<span class="' + nameClass + '">' + escHtml(m.nick || "Player") + ':</span> ' +
        '<span>' + escHtml(m.text || "") + '</span>' +
      '</div>';
    }

    box.innerHTML = html;
    if (wasAtBottom) {
      box.scrollTop = box.scrollHeight;
    }
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
      if (adminPass) {
        headers["X-Admin-Pass"] = adminPass;
      }
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          deviceId: adminPass ? "ADMIN" : "WEB-" + nick.toUpperCase().slice(0, 12),
          nick: adminPass ? "Turgut Efe" : nick,
          text: text
        })
      });
      var data = await res.json();
      if (data && data.ok && Array.isArray(data.chat)) {
        window.renderPublicChat(data.chat);
      } else {
        window.showToast("Mesaj gönderilemedi / Message failed.");
      }
    } catch (e) {
      window.showToast("Sunucu bağlantı hatası / Connection error.");
    }
  };

  window.refreshAll = async function (manual) {
    var t0 = performance.now();
    try {
      var roomsRes = await fetch("/api/rooms");
      var roomsData = await roomsRes.json();

      var chatRes = await fetch("/api/chat");
      var chatData = await chatRes.json();

      var ms = Math.max(1, Math.round(performance.now() - t0));
      var pingEl = document.getElementById("statPing");
      if (pingEl) pingEl.textContent = ms + " ms";

      var syncBadge = document.getElementById("lastSyncBadge");
      if (syncBadge) {
        syncBadge.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }

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

      if (manual) {
        window.showToast("OK (" + ms + " ms)");
      }
    } catch (e) {
      var pingEl2 = document.getElementById("statPing");
      if (pingEl2) pingEl2.textContent = "Connecting...";
    }
  };

  window.openAdminAuth = function () {
    if (adminPass) {
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
    if (!pass) {
      window.showToast("Şifre gerekli / Password required.");
      return;
    }

    try {
      var res = await fetch("/api/admin/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": pass
        },
        body: JSON.stringify({ password: pass })
      });
      var data = await res.json();
      if (!data || !data.ok) {
        window.showToast("Hatalı şifre / Invalid password!");
        return;
      }

      adminPass = pass;
      sessionStorage.setItem("turgut_admin_pass", pass);
      window.closeAdminModal();

      var sec = document.getElementById("adminSection");
      if (sec) sec.classList.add("active");

      var btn = document.getElementById("btnToggleAdmin");
      if (btn) btn.textContent = trText("adminPanel");

      cachedDevices = Array.isArray(data.devices) ? data.devices : [];
      window.renderDevicesTable();
      window.renderRoomsTable();
      window.showToast("Admin Tam Kontrol Aktif!");
    } catch (e) {
      window.showToast("Sunucu hatası / Server error.");
    }
  };

  window.logoutAdmin = function () {
    adminPass = "";
    sessionStorage.removeItem("turgut_admin_pass");
    var sec = document.getElementById("adminSection");
    if (sec) sec.classList.remove("active");
    var btn = document.getElementById("btnToggleAdmin");
    if (btn) btn.textContent = trText("adminLogin");
    window.showToast("Admin çıkış yapıldı.");
  };
  window.selectDeviceForAction = function (deviceId) {
    var inp = document.getElementById("targetDeviceIdInput");
    if (inp) {
      inp.value = deviceId;
      inp.focus();
    }
    window.showToast("Selected ID: " + deviceId);
  };

  window.renderDevicesTable = function () {
    var tbody = document.getElementById("adminDevicesBody");
    var countBadge = document.getElementById("adminDeviceCount");
    var searchEl = document.getElementById("deviceSearchInput");
    if (!tbody) return;

    if (countBadge) {
      countBadge.textContent = cachedDevices.length + trText("devicesCountSuffix");
    }

    var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
    var filtered = cachedDevices.filter(function (d) {
      if (!q) return true;
      return String(d.deviceId || "").toLowerCase().indexOf(q) !== -1 ||
        String(d.nick || "").toLowerCase().indexOf(q) !== -1 ||
        String(d.scenario || "").toLowerCase().indexOf(q) !== -1;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">' + escHtml(trText("noDevices")) + '</td></tr>';
      return;
    }

    var html = "";
    for (var i = 0; filtered.length > i; i++) {
      var d = filtered[i];
      var statusHtml = d.online
        ? '<span class="tag tag-green">' + escHtml(trText("online")) + '</span>'
        : '<span class="tag">' + escHtml(trText("offline")) + '</span>';

      var roleHtml = '<span class="tag">' + escHtml(trText("standard")) + '</span>';
      if (d.isBanned) {
        roleHtml = '<span class="tag tag-red">' + escHtml(trText("banned")) + '</span>';
      } else if (d.isVip) {
        roleHtml = '<span class="tag tag-gold">VIP</span>';
      }

      var scenDisplay = formatScenarioLabel(d.scenario, d.deviceId, d.nick);
      var safeId = escHtml(d.deviceId || "");

      var banBtnHtml = d.isBanned
        ? '<button class="btn btn-xs btn-ok" data-act="UNBAN" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("unbanBtn")) + '</button>'
        : '<button class="btn btn-xs btn-danger" data-act="BAN" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("banBtn")) + '</button>';

      html += "<tr>" +
        "<td>" + statusHtml + "</td>" +
        "<td><strong style='color:var(--gold); cursor:pointer;' data-id='" + safeId + "' onclick='window.selectDeviceForAction(this.getAttribute(\"data-id\"))'>" + safeId + "</strong></td>" +
        "<td>" + escHtml(d.nick || "Player") + "</td>" +
        "<td><span class='tag'>" + escHtml(d.screen || "MAIN_MENU") + "</span></td>" +
        "<td>" + escHtml(scenDisplay) + "</td>" +
        "<td>" + roleHtml + "</td>" +
        "<td><div class='device-actions'>" +
          '<button class="btn btn-xs btn-gold" data-act="WARN" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("warnBtn")) + '</button>' +
          '<button class="btn btn-xs btn-info" data-act="KICK" data-id="' + safeId + '" onclick="window.handleRowBtn(this)">' + escHtml(trText("kickBtn")) + '</button>' +
          banBtnHtml +
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
    if (act && devId) {
      window.quickDeviceAction(act, devId);
    }
  };

  async function postAdminAction(payload) {
    if (!adminPass) {
      window.showToast("Admin girişi gerekli / Admin login required.");
      return false;
    }
    try {
      var reqBody = Object.assign({}, payload, { password: adminPass });
      var res = await fetch("/api/admin/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": adminPass
        },
        body: JSON.stringify(reqBody)
      });
      var data = await res.json();
      if (data && data.ok) {
        await window.refreshAdminState(false);
        await window.refreshAll(false);
        return true;
      }
      window.showToast("İşlem başarısız / Action failed.");
      return false;
    } catch (e) {
      window.showToast("Sunucu hatası / Server error.");
      return false;
    }
  }

  window.sendAdminAnnounce = async function () {
    var inp = document.getElementById("adminAnnounceInput");
    var message = inp ? inp.value.trim() : "";
    if (!message) {
      window.showToast("Duyuru metni girin / Enter announcement.");
      return;
    }
    var ok = await postAdminAction({ action: "ANNOUNCE", message: message });
    if (ok) {
      inp.value = "";
      window.showToast("Duyuru yayınlandı / Announcement published!");
    }
  };

  window.runTargetedCommand = async function (action) {
    var idInp = document.getElementById("targetDeviceIdInput");
    var msgInp = document.getElementById("targetMessageInput");
    var deviceId = idInp ? idInp.value.trim().toUpperCase() : "";
    var message = msgInp ? msgInp.value.trim() : "";

    if (!deviceId) {
      window.showToast("Cihaz ID girin / Enter Device ID.");
      return;
    }
    var ok = await postAdminAction({ action: action, deviceId: deviceId, message: message });
    if (ok) {
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
      var confirmBan = confirm(deviceId + " -> Permanent Ban?");
      if (!confirmBan) return;
      message = "Your device (" + deviceId + ") has been banned by Administrator Turgut Efe.";
    }

    var ok = await postAdminAction({ action: action, deviceId: deviceId, message: message });
    if (ok) {
      window.showToast(deviceId + " -> " + action + " OK");
    }
  };

  window.adminClearChat = async function () {
    if (!confirm("Clear all lobby chat messages?")) return;
    var ok = await postAdminAction({ action: "CLEAR_CHAT" });
    if (ok) {
      window.showToast("Chat cleared!");
    }
  };

  window.refreshAdminState = async function (manual) {
    if (!adminPass) return;
    try {
      var res = await fetch("/api/admin/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pass": adminPass
        },
        body: JSON.stringify({ password: adminPass })
      });
      var data = await res.json();
      if (data && data.ok) {
        cachedDevices = Array.isArray(data.devices) ? data.devices : [];
        window.renderDevicesTable();
        window.renderRoomsTable();
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
    if (savedNick && nickInp) {
      nickInp.value = savedNick;
    }

    if (adminPass) {
      var sec = document.getElementById("adminSection");
      if (sec) sec.classList.add("active");
      var btn = document.getElementById("btnToggleAdmin");
      if (btn) btn.textContent = trText("adminPanel");
      window.refreshAdminState(false);
    }

    window.refreshAll(false);
    setInterval(function () { window.refreshAll(false); }, 3500);
    setInterval(function () {
      if (adminPass) window.refreshAdminState(false);
    }, 4500);
  });
})();
