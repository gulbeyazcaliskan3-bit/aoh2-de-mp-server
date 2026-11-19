module.exports = function renderWeb() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>AoH2 Definitive Edition — Turgut Multiplayer Portal</title>
  <style>
    :root {
      --bg-deep: #050810;
      --bg-main: #080e1a;
      --bg-card: #0d1628;
      --bg-soft: #13213c;
      --bg-hover: #182a4c;
      --border: #1f3358;
      --border-gold: rgba(243, 210, 102, 0.42);
      --gold: #f3d266;
      --gold-strong: #ffd95e;
      --gold-dim: #b5912e;
      --text: #edf2fa;
      --text-dim: #b8c6de;
      --muted: #7f92b2;
      --green: #2ecc71;
      --green-bg: rgba(46, 204, 113, 0.14);
      --red: #ff6b6b;
      --red-bg: rgba(231, 76, 60, 0.16);
      --blue: #54a0ff;
      --blue-bg: rgba(52, 152, 219, 0.16);
      --shadow-card: 0 8px 24px rgba(0, 0, 0, 0.42);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background:
        radial-gradient(circle at 15% 0%, rgba(243, 210, 102, 0.08) 0%, transparent 45%),
        radial-gradient(circle at 85% 10%, rgba(52, 152, 219, 0.10) 0%, transparent 48%),
        linear-gradient(180deg, var(--bg-main) 0%, var(--bg-deep) 100%);
      color: var(--text);
      font-size: 12px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }

    .wrap { max-width: 1180px; margin: 0 auto; padding: 12px 14px 28px 14px; }

    header.topbar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 8px; background: linear-gradient(180deg, rgba(19, 33, 60, 0.92), rgba(13, 22, 40, 0.96));
      border: 1px solid var(--border); border-radius: 11px; padding: 9px 14px;
      margin-bottom: 10px; box-shadow: var(--shadow-card);
    }

    .brand { display: flex; align-items: center; gap: 9px; }
    .brand-emblem {
      background: linear-gradient(135deg, var(--gold), var(--gold-dim));
      color: #050810; font-weight: 900; font-size: 10px; padding: 4px 8px;
      border-radius: 6px; letter-spacing: 0.5px;
    }
    .brand-titles h1 { font-size: 13.5px; font-weight: 700; color: var(--gold); }
    .brand-titles p { font-size: 10px; color: var(--muted); }

    .topbar-right { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }

    .lang-bar {
      display: inline-flex; align-items: center; gap: 3px;
      background: var(--bg-deep); border: 1px solid var(--border);
      padding: 2px; border-radius: 6px;
    }

    .status-pill {
      display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600;
      padding: 2px 8px; border-radius: 999px; background: var(--green-bg);
      border: 1px solid rgba(46, 204, 113, 0.35); color: #7bed9f; height: 22px;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      padding: 0 8px; height: 23px; font-size: 10px; font-weight: 600; border-radius: 5px;
      border: 1px solid var(--border); background: var(--bg-soft); color: var(--text);
      cursor: pointer; transition: all 0.14s ease; white-space: nowrap; user-select: none;
    }
    .btn:hover { background: var(--bg-hover); border-color: var(--gold); color: var(--gold); }
    .btn-gold {
      background: linear-gradient(135deg, var(--gold), var(--gold-dim));
      color: #050810; border: 1px solid rgba(255, 217, 94, 0.6); font-weight: 700;
    }
    .btn-gold:hover { background: linear-gradient(135deg, var(--gold-strong), var(--gold)); color: #050810; }
    .btn-sm { padding: 0 7px; height: 21px; font-size: 10px; border-radius: 5px; }
    .btn-xs { padding: 0 6px; height: 19px; font-size: 9.5px; border-radius: 4px; }
    .btn-danger { background: var(--red-bg); border-color: rgba(231, 76, 60, 0.42); color: #ff8e8e; }
    .btn-danger:hover { background: rgba(231, 76, 60, 0.28); color: #fff; }
    .btn-ok { background: var(--green-bg); border-color: rgba(46, 204, 113, 0.42); color: #7bed9f; }
    .btn-info { background: var(--blue-bg); border-color: rgba(52, 152, 219, 0.42); color: #74b9ff; }

    .notice-bar {
      background: linear-gradient(90deg, rgba(243, 210, 102, 0.13), rgba(19, 33, 60, 0.9));
      border: 1px solid var(--border-gold); border-radius: 9px; padding: 6px 11px;
      margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;
      gap: 8px; font-size: 11px;
    }
    .notice-left { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .notice-badge {
      background: var(--gold); color: #050810; font-size: 9.5px; font-weight: 800;
      padding: 1px 6px; border-radius: 4px; flex-shrink: 0;
    }
    .notice-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    @media (max-width: 760px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    .stat-card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 9px;
      padding: 8px 11px; display: flex; align-items: center; justify-content: space-between;
    }
    .stat-label { font-size: 10px; color: var(--muted); font-weight: 600; }
    .stat-val { font-size: 14px; font-weight: 800; color: var(--gold); }

    .grid-main { display: grid; grid-template-columns: 1.65fr 1fr; gap: 10px; }
    @media (max-width: 900px) { .grid-main { grid-template-columns: 1fr; } }

    .card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
      padding: 11px 12px; box-shadow: var(--shadow-card);
    }
    .card-head {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 6px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(31, 51, 88, 0.7);
    }
    .card-head h2 { font-size: 12px; font-weight: 700; color: var(--gold); }

    .table-wrap { width: 100%; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { text-align: left; padding: 6px 7px; border-bottom: 1px solid rgba(31, 51, 88, 0.45); vertical-align: middle; }
    th { color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; }
    tbody tr:hover { background: rgba(19, 33, 60, 0.45); }

    .tag {
      display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 4px;
      font-size: 9.5px; font-weight: 600; background: var(--blue-bg); color: var(--blue);
      border: 1px solid rgba(52, 152, 219, 0.35); white-space: nowrap;
    }
    .tag-gold { background: rgba(243, 210, 102, 0.14); color: var(--gold); border-color: rgba(243, 210, 102, 0.38); }
    .tag-green { background: var(--green-bg); color: #7bed9f; border-color: rgba(46, 204, 113, 0.38); }
    .tag-red { background: var(--red-bg); color: #ff8e8e; border-color: rgba(231, 76, 60, 0.4); }

    .chat-box {
      height: 225px; overflow-y: auto; background: var(--bg-deep); border: 1px solid var(--border);
      border-radius: 7px; padding: 7px 9px; margin-bottom: 7px; display: flex; flex-direction: column; gap: 4px;
    }
    .chat-line { font-size: 11px; word-break: break-word; line-height: 1.38; }
    .chat-time { font-size: 9.5px; color: var(--muted); margin-right: 4px; }
    .chat-admin { color: var(--gold); font-weight: 700; }
    .chat-vip { color: #55efc4; font-weight: 600; }

    .row-input { display: flex; gap: 5px; align-items: center; }
    input[type="text"], input[type="password"] {
      width: 100%; height: 23px; padding: 2px 8px; font-size: 11px; border-radius: 5px;
      border: 1px solid var(--border); background: var(--bg-deep); color: var(--text); outline: none;
    }
    input:focus { border-color: var(--gold); }

    .admin-section { margin-top: 12px; display: none; }
    .admin-section.active { display: block; }
    .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 10px; }
    @media (max-width: 760px) { .admin-grid { grid-template-columns: 1fr; } }
    .sub-box { background: rgba(8, 14, 26, 0.72); border: 1px solid var(--border); border-radius: 8px; padding: 9px; }
    .sub-box-title { font-size: 11px; font-weight: 700; color: var(--gold); margin-bottom: 6px; }
    .device-actions { display: flex; flex-wrap: wrap; gap: 3px; }
    .empty-state { text-align: center; padding: 18px 10px; color: var(--muted); font-size: 11px; }

    .toast {
      position: fixed; bottom: 16px; right: 16px; background: var(--bg-card);
      border: 1px solid var(--gold); color: var(--gold); padding: 7px 12px;
      border-radius: 8px; font-size: 11px; font-weight: 600;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6); z-index: 9999; display: none;
    }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(2, 5, 12, 0.78); display: none;
      align-items: center; justify-content: center; z-index: 9998; padding: 14px;
    }
    .modal-backdrop.open { display: flex; }
    .modal-card {
      width: 100%; max-width: 340px; background: var(--bg-card); border: 1px solid var(--gold);
      border-radius: 11px; padding: 14px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65);
    }
    .modal-title { font-size: 13px; font-weight: 700; color: var(--gold); margin-bottom: 6px; }
    .modal-desc { font-size: 11px; color: var(--text-dim); margin-bottom: 9px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- Üst Kurumsal Menü & Çoklu Dil Seçici -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-emblem">AoH2 DE</div>
        <div class="brand-titles">
          <h1>Turgut Edition — Multiplayer Portal</h1>
          <p data-i18n="subtitle">Canlı Sunucu Listesi, Lobi Sohbeti &amp; Merkezi Yönetim Sistemi</p>
        </div>
      </div>
      <div class="topbar-right">
        <div class="lang-bar">
          <button class="btn btn-xs" data-lang-btn="tr" onclick="window.setLanguage('tr')">TR</button>
          <button class="btn btn-xs" data-lang-btn="en" onclick="window.setLanguage('en')">EN</button>
          <button class="btn btn-xs" data-lang-btn="ru" onclick="window.setLanguage('ru')">RU</button>
          <button class="btn btn-xs" data-lang-btn="de" onclick="window.setLanguage('de')">DE</button>
          <button class="btn btn-xs" data-lang-btn="es" onclick="window.setLanguage('es')">ES</button>
        </div>
        <span class="status-pill"><span class="status-dot"></span> <span data-i18n="serverOnline">Sunucu Aktif</span></span>
        <button class="btn btn-sm" data-i18n="refresh" onclick="window.refreshAll(true)">Yenile</button>
        <button class="btn btn-gold btn-sm" id="btnToggleAdmin" data-i18n="adminLogin" onclick="window.openAdminAuth()">Admin Girişi</button>
      </div>
    </header>

    <!-- Canlı Duyuru Şeridi -->
    <div class="notice-bar">
      <div class="notice-left">
        <span class="notice-badge" data-i18n="noticeBadge">DUYURU</span>
        <span class="notice-text" id="globalAnnouncement" data-i18n="defaultNotice">AoH2 Definitive Edition Turgut Multiplayer sunucusuna hoş geldiniz!</span>
      </div>
      <span class="tag tag-gold" id="lastSyncBadge">Sync</span>
    </div>

    <!-- Üst Özet İstatistik Kartları -->
    <div class="stats-row">
      <div class="stat-card">
        <div>
          <div class="stat-label" data-i18n="statRoomsLabel">AKTİF ODA</div>
          <div class="stat-val" id="statRooms">0</div>
        </div>
        <span class="tag" data-i18n="statRoomsTag">Lobi &amp; Oyun</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label" data-i18n="statPlayersLabel">ÇEVRİMİÇİ OYUNCU</div>
          <div class="stat-val" id="statPlayers">0</div>
        </div>
        <span class="tag tag-green" data-i18n="statPlayersTag">Canlı</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label" data-i18n="statScenLabel">AKTİF SENARYO</div>
          <div class="stat-val" id="statScenario" style="font-size:12px;">Modern World</div>
        </div>
        <span class="tag tag-gold" data-i18n="statScenTag">Dinamik</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label" data-i18n="statPingLabel">SUNUCU DURUMU</div>
          <div class="stat-val" id="statPing" style="font-size:12.5px;">Online</div>
        </div>
        <span class="tag tag-green">WebSocket</span>
      </div>
    </div>

    <!-- Ana İki Sütunlu Alan: Canlı Odalar & Lobi Sohbeti -->
    <div class="grid-main">
      <!-- Sol: Canlı Odalar Listesi -->
      <div class="card">
        <div class="card-head">
          <h2 data-i18n="liveRoomsTitle">Canlı Çok Oyunculu Odalar</h2>
          <div style="display:flex; gap:5px; align-items:center;">
            <input type="text" id="roomFilterInput" data-i18n-ph="searchRoomPh" placeholder="Oda, kurucu veya senaryo ara..." style="width:155px;" oninput="window.renderRoomsTable()" />
            <button class="btn btn-xs" data-i18n="updateBtn" onclick="window.refreshAll(true)">Güncelle</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th data-i18n="thRoom">Oda Adı</th>
                <th data-i18n="thHost">Kurucu (ID)</th>
                <th data-i18n="thMap">Harita</th>
                <th data-i18n="thScenario">Senaryo</th>
                <th data-i18n="thPlayers">Oyuncu</th>
                <th data-i18n="thTurn">Tur</th>
                <th data-i18n="thStatus">Durum</th>
              </tr>
            </thead>
            <tbody id="roomsTableBody">
              <tr>
                <td colspan="7" class="empty-state" data-i18n="noRooms">Canlı odalar yükleniyor...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sağ: Canlı Lobi Sohbeti -->
      <div class="card">
        <div class="card-head">
          <h2 data-i18n="lobbyChatTitle">Canlı Lobi Sohbeti</h2>
          <span class="tag tag-gold" data-i18n="inGameSync">Oyun İçi Senkron</span>
        </div>
        <div class="chat-box" id="publicChatBox">
          <div class="empty-state" data-i18n="noChat">Sohbet geçmişi yükleniyor...</div>
        </div>
        <div class="row-input" style="margin-bottom:5px;">
          <input type="text" id="webNickInput" data-i18n-ph="nickPh" placeholder="Takma Adınız" style="max-width:115px;" maxlength="20" />
          <input type="text" id="webChatInput" data-i18n-ph="chatPh" placeholder="Lobiye mesaj yazın..." maxlength="160" onkeydown="if(event.key==='Enter') window.sendPublicChat()" />
          <button class="btn btn-gold btn-sm" data-i18n="sendBtn" onclick="window.sendPublicChat()">Gönder</button>
        </div>
        <div style="font-size:10px; color:var(--muted);" data-i18n="chatHint">
          Buradan yazdığınız mesajlar oyun içindeki Lobby Chat ekranında anında görünür.
        </div>
      </div>
    </div>
    <!-- Admin Tam Kontrol Merkezi -->
    <section class="admin-section" id="adminSection">
      <div class="card" style="border-color: var(--border-gold);">
        <div class="card-head">
          <h2 data-i18n="adminCenterTitle">Admin Tam Kontrol Merkezi — Turgut Efe</h2>
          <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
            <span class="tag tag-gold" id="adminDeviceCount">0</span>
            <button class="btn btn-xs btn-info" data-i18n="fetchData" onclick="window.refreshAdminState(true)">Verileri Çek</button>
            <button class="btn btn-xs btn-danger" data-i18n="clearChat" onclick="window.adminClearChat()">Sohbeti Temizle</button>
            <button class="btn btn-xs" data-i18n="logout" onclick="window.logoutAdmin()">Çıkış</button>
          </div>
        </div>

        <div class="admin-grid">
          <div class="sub-box">
            <div class="sub-box-title" data-i18n="box1Title">1. Oyun İçi Genel Duyuru Yayınla (MP Info)</div>
            <div class="row-input">
              <input type="text" id="adminAnnounceInput" data-i18n-ph="announcePh" placeholder="Tüm oyuncuların MP Info kutusunda görünecek mesaj..." maxlength="220" />
              <button class="btn btn-gold btn-sm" data-i18n="publishBtn" onclick="window.sendAdminAnnounce()">Yayınla</button>
            </div>
            <div style="font-size:10px; color:var(--muted); margin-top:4px;" data-i18n="box1Hint">
              Gönderdiğiniz duyuru oyuncuların oyun içindeki MP Info [NEW] penceresine anında düşer.
            </div>
          </div>

          <div class="sub-box">
            <div class="sub-box-title" data-i18n="box2Title">2. Hedef Cihaz ID'ye Özel Komut Gönder</div>
            <div class="row-input" style="margin-bottom:5px;">
              <input type="text" id="targetDeviceIdInput" data-i18n-ph="targetIdPh" placeholder="Cihaz ID (örn: AOH-9AA2D0)" style="max-width:150px; text-transform:uppercase;" maxlength="24" />
              <input type="text" id="targetMessageInput" data-i18n-ph="targetMsgPh" placeholder="Oyuncuya görünecek özel mesaj veya sebep..." maxlength="200" />
            </div>
            <div class="device-actions">
              <button class="btn btn-xs btn-gold" data-i18n="warnBtn" onclick="window.runTargetedCommand('WARN')">Özel Uyarı</button>
              <button class="btn btn-xs btn-info" data-i18n="kickBtn" onclick="window.runTargetedCommand('KICK')">Odadan At</button>
              <button class="btn btn-xs btn-danger" data-i18n="banBtn" onclick="window.runTargetedCommand('BAN')">Kalıcı Banla</button>
              <button class="btn btn-xs btn-ok" data-i18n="unbanBtn" onclick="window.runTargetedCommand('UNBAN')">Ban Kaldır</button>
              <button class="btn btn-xs" data-i18n="vipBtn" onclick="window.runTargetedCommand('VIP')">VIP Ver / Al</button>
            </div>
          </div>
        </div>

        <div class="sub-box">
          <div class="sub-box-title" style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <span data-i18n="box3Title">3. Canlı Cihaz &amp; Oyuncu Takip Listesi (Tek Tıkla Kontrol)</span>
            <input type="text" id="deviceSearchInput" data-i18n-ph="searchDevPh" placeholder="ID, isim veya senaryo ara..." style="width:160px;" oninput="window.renderDevicesTable()" />
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th data-i18n="thDevStatus">Durum</th>
                  <th data-i18n="thDevId">Cihaz ID</th>
                  <th data-i18n="thDevNick">Hesap İsmi</th>
                  <th data-i18n="thDevScreen">Ekran</th>
                  <th data-i18n="thDevScen">Senaryo</th>
                  <th data-i18n="thDevRole">Yetki</th>
                  <th data-i18n="thDevAct">Hızlı İşlemler</th>
                </tr>
              </thead>
              <tbody id="adminDevicesBody">
                <tr>
                  <td colspan="7" class="empty-state" data-i18n="noDevices">Cihaz listesi yükleniyor...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- Toast Bildirim Alanı -->
  <div class="toast" id="toastBox"></div>

  <!-- Admin Giriş Modalı -->
  <div class="modal-backdrop" id="adminModal">
    <div class="modal-card">
      <div class="modal-title" data-i18n="modalTitle">Admin Tam Kontrol Girişi</div>
      <div class="modal-desc" data-i18n="modalDesc">
        Canlı cihaz kontrolü, özel uyarı gönderme, banlama ve oyun içi duyuru yönetimi için yönetici şifresini girin.
      </div>
      <input type="password" id="adminPassInput" data-i18n-ph="passPh" placeholder="Yönetici Şifresi" onkeydown="if(event.key==='Enter') window.confirmAdminLogin()" />
      <div class="modal-footer">
        <button class="btn btn-sm" data-i18n="cancelBtn" onclick="window.closeAdminModal()">İptal</button>
        <button class="btn btn-gold btn-sm" data-i18n="loginSubmit" onclick="window.confirmAdminLogin()">Giriş Yap</button>
      </div>
    </div>
  </div>

  <script src="/lang.js"></script>
  <script src="/portal.js"></script>
  <script src="/download.js"></script>

</body>
</html>`;
};
