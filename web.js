module.exports = function renderWeb() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <meta name="theme-color" content="#050811" />
  <title>AoH2 Definitive Edition — Turgut Multiplayer Command</title>
  <style>
    :root {
      --bg-void: #04070f;
      --bg-deep: #060b16;
      --bg-main: #091122;
      --bg-card: rgba(13, 22, 42, 0.94);
      --bg-card-solid: #0d162a;
      --bg-soft: #132240;
      --bg-hover: #1a2f57;
      --border: #1e335a;
      --border-bright: #2c4b82;
      --border-gold: rgba(243, 210, 102, 0.48);
      --gold: #f3d266;
      --gold-strong: #ffe07d;
      --gold-dim: #b48c28;
      --gold-glow: rgba(243, 210, 102, 0.16);
      --text: #eef3fb;
      --text-dim: #b8c7e0;
      --muted: #7f94b8;
      --green: #2ecc71;
      --green-bg: rgba(46, 204, 113, 0.14);
      --red: #ff6b6b;
      --red-bg: rgba(231, 76, 60, 0.17);
      --blue: #54a0ff;
      --blue-bg: rgba(52, 152, 219, 0.16);
      --shadow-card: 0 12px 32px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.04);
      --shadow-gold: 0 0 22px rgba(243, 210, 102, 0.14);
      --radius-lg: 12px;
      --radius-md: 8px;
      --radius-sm: 6px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: var(--bg-deep); border-radius: 6px; }
    ::-webkit-scrollbar-thumb { background: #223861; border-radius: 6px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--gold-dim); }

    html, body {
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", sans-serif;
      background-color: var(--bg-void);
      background-image:
        radial-gradient(ellipse 80% 50% at 15% -10%, rgba(243, 210, 102, 0.10) 0%, transparent 60%),
        radial-gradient(ellipse 70% 50% at 88% 0%, rgba(52, 152, 219, 0.12) 0%, transparent 55%),
        radial-gradient(ellipse 60% 40% at 50% 100%, rgba(30, 51, 90, 0.25) 0%, transparent 70%),
        linear-gradient(180deg, var(--bg-main) 0%, var(--bg-void) 100%);
      background-attachment: fixed;
      color: var(--text);
      font-size: 12.5px;
      line-height: 1.48;
      -webkit-font-smoothing: antialiased;
    }

    .wrap {
      max-width: 1260px;
      margin: 0 auto;
      padding: 14px 16px 36px 16px;
    }

    header.topbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: linear-gradient(135deg, rgba(19, 34, 64, 0.96) 0%, rgba(11, 19, 36, 0.98) 100%);
      border: 1px solid var(--border-bright);
      border-top: 2px solid var(--gold-dim);
      border-radius: var(--radius-lg);
      padding: 11px 16px;
      margin-bottom: 12px;
      box-shadow: var(--shadow-card), var(--shadow-gold);
      backdrop-filter: blur(8px);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .brand-crest {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      background: linear-gradient(145deg, #21355d, #0b1324);
      border: 1px solid var(--border-gold);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 10px rgba(243, 210, 102, 0.18);
      flex-shrink: 0;
    }

    .brand-titles h1 {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: var(--gold);
      text-shadow: 0 1px 8px rgba(243, 210, 102, 0.25);
    }

    .brand-titles p {
      font-size: 10.5px;
      color: var(--muted);
      margin-top: 1px;
    }

    .topbar-right {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .lang-bar {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-deep);
      border: 1px solid var(--border);
      padding: 2px;
      border-radius: 7px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--green-bg);
      border: 1px solid rgba(46, 204, 113, 0.42);
      color: #82f3ad;
      height: 25px;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: pulseLive 1.9s infinite ease-in-out;
    }

    @keyframes pulseLive {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.28); opacity: 0.55; }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 0 10px;
      height: 26px;
      font-size: 11px;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: linear-gradient(180deg, #17294d 0%, #111f3b 100%);
      color: var(--text);
      cursor: pointer;
      transition: transform 0.08s ease, border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
      white-space: nowrap;
      user-select: none;
    }

    .btn:hover {
      background: linear-gradient(180deg, #1e3563 0%, #15264a 100%);
      border-color: var(--gold);
      color: var(--gold);
    }

    .btn:active { transform: translateY(1px); }

    .btn-gold {
      background: linear-gradient(135deg, var(--gold-strong) 0%, var(--gold-dim) 100%);
      color: #060a14;
      border: 1px solid rgba(255, 224, 125, 0.75);
      font-weight: 800;
      box-shadow: 0 2px 10px rgba(243, 210, 102, 0.2);
    }

    .btn-gold:hover {
      background: linear-gradient(135deg, #ffea9f 0%, var(--gold) 100%);
      color: #04070f;
    }

    .btn-sm { padding: 0 9px; height: 24px; font-size: 10.5px; }
    .btn-xs { padding: 0 7px; height: 21px; font-size: 10px; border-radius: 5px; }
    .btn-danger { background: rgba(231, 76, 60, 0.18); border-color: rgba(231, 76, 60, 0.48); color: #ff9a9a; }
    .btn-danger:hover { background: rgba(231, 76, 60, 0.34); border-color: #ff6b6b; color: #fff; }
    .btn-ok { background: rgba(46, 204, 113, 0.16); border-color: rgba(46, 204, 113, 0.46); color: #82f3ad; }
    .btn-ok:hover { background: rgba(46, 204, 113, 0.3); border-color: #2ecc71; color: #fff; }
    .btn-info { background: rgba(52, 152, 219, 0.18); border-color: rgba(52, 152, 219, 0.48); color: #85c7ff; }
    .btn-info:hover { background: rgba(52, 152, 219, 0.32); border-color: #54a0ff; color: #fff; }

    .notice-bar {
      background: linear-gradient(90deg, rgba(243, 210, 102, 0.14) 0%, rgba(15, 26, 48, 0.94) 65%);
      border: 1px solid var(--border-gold);
      border-radius: var(--radius-md);
      padding: 8px 13px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 11.5px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
    }

    .notice-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .notice-badge {
      background: linear-gradient(135deg, var(--gold), var(--gold-dim));
      color: #050810;
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 0.4px;
      padding: 2px 7px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .notice-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
      font-weight: 500;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    @media (max-width: 820px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }

    .stat-card {
      background: linear-gradient(180deg, rgba(16, 28, 52, 0.94), rgba(10, 18, 34, 0.98));
      border: 1px solid var(--border);
      border-left: 3px solid var(--gold-dim);
      border-radius: var(--radius-md);
      padding: 10px 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      box-shadow: var(--shadow-card);
    }

    .stat-label {
      font-size: 9.5px;
      color: var(--muted);
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .stat-val {
      font-size: 16px;
      font-weight: 800;
      color: var(--gold);
      margin-top: 2px;
    }

    .grid-main {
      display: grid;
      grid-template-columns: 1.72fr 1fr;
      gap: 12px;
    }

    @media (max-width: 960px) { .grid-main { grid-template-columns: 1fr; } }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 13px 14px;
      box-shadow: var(--shadow-card);
      backdrop-filter: blur(6px);
    }

    .card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(44, 75, 130, 0.45);
    }

    .card-head h2 {
      font-size: 13px;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: 0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
      max-height: 360px;
      overflow-y: auto;
      border: 1px solid rgba(30, 51, 90, 0.55);
      border-radius: var(--radius-md);
      background: rgba(6, 11, 22, 0.55);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }

    th, td {
      text-align: left;
      padding: 7px 9px;
      border-bottom: 1px solid rgba(30, 51, 90, 0.5);
      vertical-align: middle;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #0b1427;
      color: var(--muted);
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.45px;
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-bright);
    }

    tbody tr { transition: background 0.12s ease; }
    tbody tr:hover { background: rgba(26, 47, 87, 0.46); }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      background: var(--blue-bg);
      color: #82bfff;
      border: 1px solid rgba(52, 152, 219, 0.36);
      white-space: nowrap;
    }

    .tag-gold { background: rgba(243, 210, 102, 0.15); color: var(--gold); border-color: rgba(243, 210, 102, 0.42); }
    .tag-green { background: var(--green-bg); color: #82f3ad; border-color: rgba(46, 204, 113, 0.42); }
    .tag-red { background: var(--red-bg); color: #ff9a9a; border-color: rgba(231, 76, 60, 0.45); }

    .chat-box {
      height: 265px;
      overflow-y: auto;
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 9px 10px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .chat-line {
      font-size: 11.5px;
      word-break: break-word;
      line-height: 1.42;
      padding: 3px 6px;
      border-radius: 5px;
      background: rgba(15, 26, 48, 0.45);
    }

    .chat-time { font-size: 9.5px; color: var(--muted); margin-right: 5px; }
    .chat-admin { color: var(--gold); font-weight: 800; }
    .chat-vip { color: #55efc4; font-weight: 700; }

    .row-input { display: flex; gap: 6px; align-items: center; }

    input[type="text"], input[type="password"] {
      width: 100%;
      height: 27px;
      padding: 3px 10px;
      font-size: 11.5px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--bg-deep);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    input:focus {
      border-color: var(--gold);
      box-shadow: 0 0 0 2px rgba(243, 210, 102, 0.14);
    }

    .admin-section { margin-top: 14px; display: none; }
    .admin-section.active { display: block; }
    .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    @media (max-width: 820px) { .admin-grid { grid-template-columns: 1fr; } }

    .sub-box {
      background: rgba(7, 13, 26, 0.82);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 10px 11px;
      margin-bottom: 10px;
    }

    .sub-box-title {
      font-size: 11.5px;
      font-weight: 800;
      color: var(--gold);
      margin-bottom: 7px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .device-actions { display: flex; flex-wrap: wrap; gap: 4px; }
    .empty-state { text-align: center; padding: 22px 12px; color: var(--muted); font-size: 11.5px; }

    .footer-bar {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid rgba(30, 51, 90, 0.55);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 10.5px;
    }

    .toast {
      position: fixed;
      bottom: 18px;
      right: 18px;
      background: var(--bg-card-solid);
      border: 1px solid var(--gold);
      color: var(--gold);
      padding: 9px 14px;
      border-radius: var(--radius-md);
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 8px 26px rgba(0, 0, 0, 0.68);
      z-index: 9999;
      display: none;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 5, 12, 0.82);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      padding: 16px;
    }

    .modal-backdrop.open { display: flex; }

    .modal-card {
      width: 100%;
      max-width: 360px;
      background: var(--bg-card-solid);
      border: 1px solid var(--gold);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: 0 14px 38px rgba(0, 0, 0, 0.72), var(--shadow-gold);
    }

    .modal-title { font-size: 14px; font-weight: 800; color: var(--gold); margin-bottom: 6px; }
    .modal-desc { font-size: 11.5px; color: var(--text-dim); margin-bottom: 11px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 7px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="topbar">
      <div class="brand">
        <div class="brand-crest">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L4 5.5V11.5C4 16.8 7.4 21.5 12 23C16.6 21.5 20 16.8 20 11.5V5.5L12 2Z" stroke="#f3d266" stroke-width="1.8" fill="rgba(243,210,102,0.12)"/>
            <path d="M8.5 13.5L12 7L15.5 13.5H8.5Z" fill="#f3d266"/>
          </svg>
        </div>
        <div class="brand-titles">
          <h1>AoH2 DE — Turgut Edition Multiplayer</h1>
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

    <div class="notice-bar">
      <div class="notice-left">
        <span class="notice-badge" data-i18n="noticeBadge">DUYURU</span>
        <span class="notice-text" id="globalAnnouncement" data-i18n="defaultNotice">AoH2 Definitive Edition Turgut Multiplayer sunucusuna hoş geldiniz!</span>
      </div>
      <span class="tag tag-gold" id="lastSyncBadge">Sync</span>
    </div>

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
          <div class="stat-val" id="statScenario" style="font-size:13px;">-</div>
        </div>
        <span class="tag tag-gold" data-i18n="statScenTag">Dinamik</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label" data-i18n="statPingLabel">SUNUCU DURUMU</div>
          <div class="stat-val" id="statPing" style="font-size:13px;">Online</div>
        </div>
        <span class="tag tag-green">Turso + WS</span>
      </div>
    </div>
    <div class="grid-main">
      <div class="card">
        <div class="card-head">
          <h2 data-i18n="liveRoomsTitle">Canlı Çok Oyunculu Odalar</h2>
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" id="roomFilterInput" data-i18n-ph="searchRoomPh" placeholder="Oda, kurucu veya senaryo ara..." style="width:175px;" oninput="window.renderRoomsTable()" />
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

      <div class="card">
        <div class="card-head">
          <h2 data-i18n="lobbyChatTitle">Canlı Lobi Sohbeti</h2>
          <span class="tag tag-gold" data-i18n="inGameSync">Oyun İçi Senkron</span>
        </div>
        <div class="chat-box" id="publicChatBox">
          <div class="empty-state" data-i18n="noChat">Sohbet geçmişi yükleniyor...</div>
        </div>
        <div class="row-input" style="margin-bottom:6px;">
          <input type="text" id="webNickInput" data-i18n-ph="nickPh" placeholder="Takma Adınız" style="max-width:125px;" maxlength="20" />
          <input type="text" id="webChatInput" data-i18n-ph="chatPh" placeholder="Lobiye mesaj yazın..." maxlength="180" onkeydown="if(event.key==='Enter') window.sendPublicChat()" />
          <button class="btn btn-gold btn-sm" data-i18n="sendBtn" onclick="window.sendPublicChat()">Gönder</button>
        </div>
        <div style="font-size:10.5px; color:var(--muted);" data-i18n="chatHint">
          Buradan yazdığınız mesajlar oyun içindeki lobi sohbetinde anında görünür.
        </div>
      </div>
    </div>

    <section class="admin-section" id="adminSection">
      <div class="card" style="border-color: var(--border-gold); box-shadow: var(--shadow-card), var(--shadow-gold);">
        <div class="card-head">
          <h2 data-i18n="adminCenterTitle">Admin Tam Kontrol Merkezi — Turgut Efe</h2>
          <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
            <span class="tag tag-gold" id="adminDeviceCount">0</span>
            <span class="tag" id="adminRoomCount">0</span>
            <button class="btn btn-xs btn-info" data-i18n="fetchData" onclick="window.refreshAdminState(true)">Verileri Çek</button>
            <button class="btn btn-xs btn-danger" data-i18n="clearChat" onclick="window.adminClearChat()">Sohbeti Temizle</button>
            <button class="btn btn-xs" data-i18n="logout" onclick="window.logoutAdmin(false)">Çıkış</button>
          </div>
        </div>

        <div class="admin-grid">
          <div class="sub-box">
            <div class="sub-box-title" data-i18n="box1Title">1. Oyun İçi Genel Duyuru (MP Info)</div>
            <div class="row-input">
              <input type="text" id="adminAnnounceInput" data-i18n-ph="announcePh" placeholder="Tüm oyuncuların MP Info kutusunda görünecek mesaj..." maxlength="220" />
              <button class="btn btn-gold btn-sm" data-i18n="publishBtn" onclick="window.sendAdminAnnounce()">Yayınla</button>
            </div>
            <div style="font-size:10px; color:var(--muted); margin-top:5px;" data-i18n="box1Hint">
              Duyuru Turso veritabanına kaydedilir ve tüm oyunculara anında iletilir.
            </div>
          </div>

          <div class="sub-box">
            <div class="sub-box-title" data-i18n="boxAdminChatTitle">1B. Resmi Admin Mesajı Gönder</div>
            <div class="row-input">
              <input type="text" id="adminDirectChatInput" data-i18n-ph="adminChatPh" placeholder="Sohbete [ADMIN] Turgut Efe olarak yaz..." maxlength="200" onkeydown="if(event.key==='Enter') window.sendAdminDirectChat()" />
              <button class="btn btn-gold btn-sm" data-i18n="sendBtn" onclick="window.sendAdminDirectChat()">Gönder</button>
            </div>
          </div>
        </div>

        <div class="sub-box">
          <div class="sub-box-title" data-i18n="box2Title">2. Hedef Cihaz ID'ye Özel Komut Gönder</div>
          <div class="row-input" style="margin-bottom:7px; flex-wrap:wrap;">
            <input type="text" id="targetDeviceIdInput" data-i18n-ph="targetIdPh" placeholder="Cihaz ID (örn: AOH-9AA2D0)" style="max-width:175px; text-transform:uppercase;" maxlength="24" />
            <input type="text" id="targetMessageInput" data-i18n-ph="targetMsgPh" placeholder="Oyuncuya görünecek uyarı veya sebep..." style="flex:1; min-width:200px;" maxlength="200" />
          </div>
          <div class="device-actions">
            <button class="btn btn-xs btn-gold" data-i18n="warnBtn" onclick="window.runTargetedCommand('WARN')">Uyar</button>
            <button class="btn btn-xs btn-info" data-i18n="kickBtn" onclick="window.runTargetedCommand('KICK')">Odadan At</button>
            <button class="btn btn-xs btn-info" data-i18n="muteBtn" onclick="window.runTargetedCommand('MUTE')">Sustur</button>
            <button class="btn btn-xs btn-ok" data-i18n="unmuteBtn" onclick="window.runTargetedCommand('UNMUTE')">Sustur Aç</button>
            <button class="btn btn-xs btn-danger" data-i18n="banBtn" onclick="window.runTargetedCommand('BAN')">Banla</button>
            <button class="btn btn-xs btn-ok" data-i18n="unbanBtn" onclick="window.runTargetedCommand('UNBAN')">Ban Aç</button>
            <button class="btn btn-xs" data-i18n="vipBtn" onclick="window.runTargetedCommand('VIP')">VIP</button>
          </div>
        </div>

        <div class="admin-grid">
          <div class="sub-box">
            <div class="sub-box-title" data-i18n="boxRoomsTitle">3. Canlı Oda Yönetimi</div>
            <div class="table-wrap" style="max-height:240px;">
              <table>
                <thead>
                  <tr>
                    <th data-i18n="thRoom">Oda</th>
                    <th data-i18n="thHost">Kurucu</th>
                    <th data-i18n="thScenario">Harita / Senaryo</th>
                    <th data-i18n="thPlayers">Oyuncu</th>
                    <th data-i18n="thRoomAct">İşlem</th>
                  </tr>
                </thead>
                <tbody id="adminRoomsBody">
                  <tr><td colspan="5" class="empty-state" data-i18n="noRooms">Aktif oda yok.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="sub-box">
            <div class="sub-box-title" data-i18n="boxChatModTitle">4. Sohbet Moderasyonu (Son Mesajlar)</div>
            <div class="table-wrap" style="max-height:240px;">
              <table>
                <thead>
                  <tr>
                    <th data-i18n="thDevNick">Hesap</th>
                    <th data-i18n="lobbyChatTitle">Mesaj</th>
                    <th data-i18n="thRoomAct">İşlem</th>
                  </tr>
                </thead>
                <tbody id="adminChatBody">
                  <tr><td colspan="3" class="empty-state" data-i18n="noChatMod">Denetlenecek mesaj yok.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="sub-box" style="margin-bottom:0;">
          <div class="sub-box-title">
            <span data-i18n="box3Title">5. Kalıcı Cihaz &amp; Oyuncu Listesi</span>
            <input type="text" id="deviceSearchInput" data-i18n-ph="searchDevPh" placeholder="ID, isim, ekran veya senaryo ara..." style="width:210px;" oninput="window.renderDevicesTable()" />
          </div>
          <div class="table-wrap" style="max-height:360px;">
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

    <footer class="footer-bar">
      <span>Age of History II Definitive Edition — Turgut Edition Multiplayer Command</span>
      <span>Turso Persistent Edge DB • WebSocket Relay v2</span>
    </footer>
  </div>

  <div class="toast" id="toastBox"></div>

  <div class="modal-backdrop" id="adminModal">
    <div class="modal-card">
      <div class="modal-title" data-i18n="modalTitle">Admin Tam Kontrol Girişi</div>
      <div class="modal-desc" data-i18n="modalDesc">
        Kalıcı cihaz yönetimi, sohbet moderasyonu, ban ve duyuru kontrolü için yönetici şifresini girin.
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
