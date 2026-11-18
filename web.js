function renderWebPage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Age of History II DE — Turgut Edition Multiplayer</title>
<style>
  :root {
    --bg-deep: #050810;
    --bg-grad: #111e38;
    --panel: rgba(13, 21, 38, 0.96);
    --panel-alt: #13203a;
    --gold: #d4af37;
    --gold-bright: #f7d97e;
    --gold-border: rgba(212, 175, 55, 0.28);
    --text-main: #edf2fa;
    --text-muted: #8a9bb5;
    --green: #2ecc71;
    --yellow: #f1c40f;
    --red: #e74c3c;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background:
      radial-gradient(ellipse at top, var(--bg-grad) 0%, transparent 60%),
      radial-gradient(circle at bottom right, #0c162b 0%, var(--bg-deep) 75%);
    background-color: var(--bg-deep);
    color: var(--text-main);
    min-height: 100vh;
    padding: 12px 10px 44px;
    line-height: 1.45;
  }
  .wrap { max-width: 1120px; margin: 0 auto; }

  /* Üst Navigasyon */
  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--gold-border);
    border-radius: 10px;
    padding: 8px 12px;
    margin-bottom: 10px;
    gap: 8px;
    flex-wrap: wrap;
  }
  .srv-status {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 700;
    color: var(--gold-bright);
    letter-spacing: 0.4px;
  }
  .pulse {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 10px var(--green);
    animation: blink 1.6s infinite;
    flex-shrink: 0;
  }
  .pulse.maint {
    background: var(--red);
    box-shadow: 0 0 10px var(--red);
  }
  @keyframes blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(1.2); } }
  .nav-right { display: flex; align-items: center; gap: 6px; }
  .lang-bar { display: flex; gap: 3px; }
  .lang-btn {
    background: rgba(6, 10, 18, 0.75);
    border: 1px solid var(--gold-border);
    color: var(--text-muted);
    padding: 3px 7px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }
  .lang-btn.active, .lang-btn:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
    background: rgba(212, 175, 55, 0.22);
  }
  .admin-trigger {
    background: rgba(231, 76, 60, 0.14);
    border: 1px solid rgba(231, 76, 60, 0.45);
    color: #ff8787;
    padding: 3px 9px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }
  .admin-trigger:hover { background: rgba(231, 76, 60, 0.28); }

  /* Canlı Duyuru Bannerı */
  .notice-bar {
    background: linear-gradient(90deg, rgba(212, 175, 55, 0.16), rgba(20, 32, 58, 0.95), rgba(212, 175, 55, 0.16));
    border: 1px solid var(--gold);
    border-radius: 10px;
    padding: 9px 14px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    color: var(--gold-bright);
  }
  .notice-tag {
    background: var(--gold);
    color: #050810;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  /* Başlık & Kalıcı İndirme + Telegram Butonları */
  .hero {
    background: linear-gradient(180deg, rgba(20, 32, 58, 0.96), rgba(9, 15, 28, 0.98));
    border: 1px solid var(--gold-border);
    border-radius: 12px;
    padding: 16px 14px;
    text-align: center;
    margin-bottom: 12px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  }
  .hero h1 {
    font-size: clamp(17px, 3.8vw, 27px);
    color: var(--gold-bright);
    letter-spacing: 0.7px;
    margin-bottom: 4px;
  }
  .hero p { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
  .hero-btns {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .dl-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: linear-gradient(180deg, #f3d266, #c99e26);
    color: #060a12;
    text-decoration: none;
    font-weight: 800;
    font-size: 12px;
    padding: 9px 18px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(212, 175, 55, 0.35);
  }
  .tg-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: linear-gradient(180deg, #2fb2f0, #1b88bd);
    color: #ffffff;
    text-decoration: none;
    font-weight: 800;
    font-size: 12px;
    padding: 9px 18px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(36, 161, 222, 0.35);
  }

  /* Canlı Lobi Tablosu */
  .lobby-card {
    background: var(--panel);
    border: 1px solid var(--gold);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  }
  .lobby-head {
    background: var(--panel-alt);
    border-bottom: 1px solid var(--gold-border);
    padding: 10px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .lobby-title-wrap { display: flex; align-items: center; gap: 8px; }
  .lobby-title { font-size: 14px; font-weight: 700; color: var(--gold-bright); }
  .live-pill {
    background: rgba(231, 76, 60, 0.2);
    border: 1px solid rgba(231, 76, 60, 0.45);
    color: #ff7675;
    font-size: 10px;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 4px;
  }
  .lobby-actions { display: flex; align-items: center; gap: 6px; }
  .search-inp {
    background: rgba(5, 8, 16, 0.85);
    border: 1px solid var(--gold-border);
    color: var(--text-main);
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    width: 130px;
    outline: none;
  }
  .btn-mini {
    background: rgba(212, 175, 55, 0.16);
    border: 1px solid var(--gold);
    color: var(--gold-bright);
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .tbl-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th {
    padding: 9px 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--text-muted);
    background: rgba(5, 8, 16, 0.65);
    border-bottom: 1px solid var(--gold-border);
    white-space: nowrap;
  }
  td {
    padding: 10px;
    font-size: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    white-space: nowrap;
  }
  tr:hover td { background: rgba(212, 175, 55, 0.04); }
  .host-wrap { display: flex; align-items: center; gap: 7px; font-weight: 700; color: #fff; }
  .av {
    width: 24px; height: 24px; border-radius: 6px;
    background: linear-gradient(135deg, #d4af37, #8a6d1b);
    color: #050810; font-weight: 800; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .vip-tag {
    background: linear-gradient(90deg, #f3d266, #d4af37);
    color: #050810;
    font-size: 9px;
    font-weight: 900;
    padding: 1px 5px;
    border-radius: 4px;
  }
  .code-pill {
    font-family: monospace;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.16);
    color: var(--gold-bright);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
  }
  .tag-map {
    background: rgba(52, 152, 219, 0.16);
    border: 1px solid rgba(52, 152, 219, 0.35);
    color: #74b9ff;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }
  .tag-turn {
    background: rgba(212, 175, 55, 0.16);
    border: 1px solid var(--gold-border);
    color: var(--gold-bright);
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 700;
  }
  .tag-open {
    background: rgba(46, 204, 113, 0.16);
    border: 1px solid rgba(46, 204, 113, 0.35);
    color: #55efc4;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
  }
  .tag-lock {
    background: rgba(231, 76, 60, 0.16);
    border: 1px solid rgba(231, 76, 60, 0.35);
    color: #ff7675;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
  }
  .empty-row { text-align: center; padding: 28px 14px; color: var(--text-muted); font-size: 12px; white-space: normal; }
  .empty-row strong { display: block; color: var(--gold-bright); font-size: 13px; margin-bottom: 3px; }
</style>
</head>
<style>
  .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
  @media (min-width: 740px) { .stats { grid-template-columns: repeat(4, 1fr); } }
  .scard {
    background: var(--panel);
    border: 1px solid var(--gold-border);
    border-radius: 10px;
    padding: 10px 12px;
  }
  .slabel { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
  .sval { font-size: 18px; font-weight: 800; color: var(--gold-bright); margin-bottom: 2px; }
  .ssub { font-size: 11px; color: var(--text-muted); }
  .bar-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; margin-top: 5px; overflow: hidden; }
  .bar-fill { height: 100%; width: 25%; background: var(--green); border-radius: 99px; transition: width 0.35s ease, background 0.35s ease; }

  .guide {
    background: var(--panel);
    border: 1px solid var(--gold-border);
    border-radius: 10px;
    padding: 12px 14px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }
  .gstep { background: rgba(5, 8, 16, 0.55); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 9px 11px; }
  .gstep b { display: block; color: var(--gold-bright); font-size: 12px; margin-bottom: 2px; }
  .gstep span { font-size: 11px; color: var(--text-muted); }

  /* Hazır AdSense Reklam Yuvası */
  .ad-slot {
    background: rgba(10, 16, 30, 0.75);
    border: 1px dashed rgba(212, 175, 55, 0.22);
    border-radius: 10px;
    padding: 10px;
    text-align: center;
    margin-bottom: 12px;
    min-height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 11px;
  }
  footer { text-align: center; font-size: 11px; color: var(--text-muted); }

  /* Çok Sekmeli Admin Yönetim Modalı */
  .modal-bg {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 12, 0.88);
    backdrop-filter: blur(5px);
    z-index: 9999;
    align-items: center;
    justify-content: center;
    padding: 10px;
    overflow-y: auto;
  }
  .modal-bg.open { display: flex; }
  .modal-card {
    background: #0d1526;
    border: 1px solid var(--gold);
    border-radius: 14px;
    width: 100%;
    max-width: 780px;
    max-height: 92vh;
    overflow-y: auto;
    padding: 16px;
    box-shadow: 0 20px 55px rgba(0, 0, 0, 0.85);
  }
  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--gold-border);
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .modal-head h2 { font-size: 15px; color: var(--gold-bright); }
  .close-x {
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18);
    color: #fff;
    padding: 3px 9px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 700;
  }
  .adm-tabs { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; }
  .adm-tab {
    background: rgba(5, 8, 16, 0.8);
    border: 1px solid var(--gold-border);
    color: var(--text-muted);
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .adm-tab.active {
    background: rgba(212, 175, 55, 0.22);
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .adm-sec { display: none; }
  .adm-sec.active { display: block; }
  .adm-group { margin-bottom: 11px; }
  .adm-group label { display: block; font-size: 11px; color: var(--gold-bright); font-weight: 700; margin-bottom: 4px; }
  .adm-inp {
    width: 100%;
    background: #060a12;
    border: 1px solid var(--gold-border);
    color: #fff;
    padding: 7px 10px;
    border-radius: 7px;
    font-size: 12px;
    outline: none;
  }
  .adm-inp:focus { border-color: var(--gold); }
  .adm-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
  .adm-btn {
    background: linear-gradient(180deg, #f3d266, #c99e26);
    color: #050810;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }
  .adm-btn-sec {
    background: rgba(52, 152, 219, 0.2);
    border: 1px solid rgba(52, 152, 219, 0.5);
    color: #74b9ff;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }
  .adm-btn-vip {
    background: rgba(212, 175, 55, 0.2);
    border: 1px solid rgba(212, 175, 55, 0.55);
    color: var(--gold-bright);
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }
  .adm-btn-danger {
    background: rgba(231, 76, 60, 0.2);
    border: 1px solid rgba(231, 76, 60, 0.55);
    color: #ff7675;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
  }
  .adm-msg { font-size: 11px; margin-top: 6px; color: var(--green); min-height: 16px; }
  .adm-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(5, 8, 16, 0.72);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 8px 10px;
    border-radius: 8px;
    margin-bottom: 6px;
    font-size: 11px;
    gap: 8px;
    flex-wrap: wrap;
  }
  .dot-on { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--green); margin-right: 4px; }
  .dot-off { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #636e72; margin-right: 4px; }
</style>
<body>
<div class="wrap">
  <nav class="nav">
    <div class="srv-status">
      <span class="pulse" id="srvDot"></span>
      <span id="tSrvStatus">TR-EU SUNUCU ÇEVRİMİÇİ</span>
    </div>
    <div class="nav-right">
      <div class="lang-bar">
        <button class="lang-btn active" id="btn-tr" onclick="setLang('tr')">TR</button>
        <button class="lang-btn" id="btn-en" onclick="setLang('en')">EN</button>
        <button class="lang-btn" id="btn-ru" onclick="setLang('ru')">RU</button>
      </div>
      <button class="admin-trigger" onclick="openAdminModal()">Admin</button>
    </div>
  </nav>

  <div class="notice-bar">
    <span class="notice-tag" id="tNoticeTag">DUYURU</span>
    <span id="noticeText">Welcome to AoH2 DE Turgut Edition Multiplayer! Server is online.</span>
  </div>

  <header class="hero">
    <h1>AGE OF HISTORY II — TURGUT EDITION</h1>
    <p id="tHeroSub">Definitive Edition 2.01 Çok Oyunculu Resmi Lobi &amp; Sunucu Merkezi</p>
    <div class="hero-btns">
      <a class="dl-btn" id="dlBtn" href="https://www.mediafire.com/file/dvd3fdnoibv47as/AgeOfHistoryDEMultiplayer1 . apk/file" target="_blank" rel="noopener">&#11015; <span id="dlBtnText">Download APK (405 MB)</span></a>
      <a class="tg-btn" id="tgBtn" href="https://t.me/Ageofmultiplayer" target="_blank" rel="noopener">&#9992; <span id="tgBtnText">Telegram Kanalı (@Ageofmultiplayer)</span></a>
    </div>
  </header>

  <section class="lobby-card">
    <div class="lobby-head">
      <div class="lobby-title-wrap">
        <span class="lobby-title" id="tLobbyTitle">Canlı Çok Oyunculu Lobiler</span>
        <span class="live-pill" id="tLiveTag">CANLI</span>
      </div>
      <div class="lobby-actions">
        <input type="text" class="search-inp" id="searchInp" placeholder="Lobi, kod veya senaryo ara..." oninput="applyFilter()">
        <button class="btn-mini" id="tRefreshBtn" onclick="fetchLobby()">Yenile</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th id="thHost">Oda Kurucusu (Host)</th>
            <th id="thCode">Oda Kodu</th>
            <th id="thMap">Harita</th>
            <th id="thScen">Senaryo</th>
            <th id="thTurn">Tur</th>
            <th id="thPlayers">Oyuncular</th>
            <th id="thStatus">Durum</th>
          </tr>
        </thead>
        <tbody id="lobbyBody">
          <tr><td colspan="7" class="empty-row"><strong>...</strong></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="stats">
    <div class="scard">
      <div class="slabel" id="tPingLbl">Sunucu Ping</div>
      <div class="sval" id="vPing">-- ms</div>
      <div class="ssub" id="sPing">...</div>
      <div class="bar-bg"><div class="bar-fill" id="pingBar"></div></div>
    </div>
    <div class="scard">
      <div class="slabel" id="tRoomsLbl">Aktif Odalar</div>
      <div class="sval" id="vRooms">0</div>
      <div class="ssub" id="sRooms">0 açık lobi</div>
    </div>
    <div class="scard">
      <div class="slabel" id="tPlayersLbl">Oyuncular</div>
      <div class="sval" id="vPlayers">0</div>
      <div class="ssub" id="sPlayers">Tekil aktif cihaz</div>
    </div>
    <div class="scard">
      <div class="slabel" id="tUptimeLbl">Çalışma Süresi</div>
      <div class="sval" id="vUptime">0 dk</div>
      <div class="ssub" id="sUptime">7/24 Kesintisiz Relay</div>
    </div>
  </section>

  <section class="guide">
    <div class="gstep">
      <b id="g1Title">1. Oda Kurma</b>
      <span id="g1Desc">Oyunda Çok Oyunculu → Oyun Kur menüsünden TR-EU sunucusunu seçip 6 haneli oda kodunu oluşturun.</span>
    </div>
    <div class="gstep">
      <b id="g2Title">2. Lobiye Katılma</b>
      <span id="g2Desc">Sunucu listesinden açık odalara tek dokunuşla girin veya arkadaşınızın oda kodunu yazın.</span>
    </div>
    <div class="gstep">
      <b id="g3Title">3. Kalıcı Kimlik &amp; Senkron</b>
      <span id="g3Desc">Her cihaz kalıcı AOH kimliği ile korunur; diplomasi, savaş ve tur geçişleri anlık eşitlenir.</span>
    </div>
  </section>

  <!-- İleride Google AdSense Reklam Kodu Buraya Yerleştirilir -->
  <div class="ad-slot" id="adsenseContainer">
    <span>Sponsor &amp; Topluluk Alanı — AoH2 DE Turgut Edition</span>
  </div>

  <footer id="tFooter">Age of History II Definitive Edition — Turgut Edition Multiplayer</footer>
</div>

<!-- Admin Tam Kontrol Modalı -->
<div class="modal-bg" id="adminModal">
  <div class="modal-card">
    <div class="modal-head">
      <h2>Turgut Edition — Admin Tam Kontrol Merkezi</h2>
      <button class="close-x" onclick="closeAdminModal()">X</button>
    </div>

    <div id="adminLoginBox">
      <div class="adm-group">
        <label>Yönetici Şifresi</label>
        <input type="password" class="adm-inp" id="adminPassInp" placeholder="Admin şifresini girin...">
      </div>
      <button class="adm-btn" onclick="adminLogin()">Giriş Yap</button>
      <div class="adm-msg" id="adminLoginErr" style="color:#ff7675;"></div>
    </div>

    <div id="adminPanelBox" style="display:none;">
      <div class="adm-tabs">
        <button class="adm-tab active" id="tabBtn-general" onclick="switchAdminTab('general')">Bildirim &amp; Sunucu</button>
        <button class="adm-tab" id="tabBtn-devices" onclick="switchAdminTab('devices')">Cihaz ID Takip (<span id="admDevCount">0</span>)</button>
        <button class="adm-tab" id="tabBtn-rooms" onclick="switchAdminTab('rooms')">Odalar (<span id="admRoomCount">0</span>)</button>
        <button class="adm-tab" id="tabBtn-chat" onclick="switchAdminTab('chat')">Lobi Sohbeti</button>
      </div>

      <!-- Sekme 1: Bildirim & Sunucu Ayarları -->
      <div class="adm-sec active" id="tabSec-general">
        <div class="adm-group">
          <label>Oyun İçi Ana Menü &amp; Bilgi Penceresi Bildirimi (İngilizce)</label>
          <input type="text" class="adm-inp" id="admNoticeInp" maxlength="180" placeholder="Welcome to AoH2 DE Turgut Edition Multiplayer!">
        </div>
        <div class="adm-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="admMaintChk"> Bakım Modu (Yeni oda kurulumunu geçici olarak durdurur)
          </label>
        </div>
        <div class="adm-row">
          <button class="adm-btn" onclick="saveAdminSettings()">Bildirimi Yayınla &amp; Kaydet</button>
          <button class="adm-btn-sec" onclick="refreshAdminData()">Paneli Yenile</button>
        </div>
        <div class="adm-msg" id="adminSaveMsg"></div>
      </div>

      <!-- Sekme 2: Anlık Cihaz ID Takibi & Oyuncu Kontrolü -->
      <div class="adm-sec" id="tabSec-devices">
        <div class="adm-group">
          <label>Seçili Cihaza Anlık Pop-Up Uyarı / Kick Gönder</label>
          <div class="adm-row">
            <input type="text" class="adm-inp" id="admTargetDevInp" style="max-width:140px;" placeholder="AOH-XXXXXX">
            <input type="text" class="adm-inp" id="admAlertTextInp" style="flex:1;" placeholder="Oyuncuya görünecek uyarı mesajı...">
            <button class="adm-btn" onclick="adminSendAlert()">Uyarı Gönder</button>
            <button class="adm-btn-danger" onclick="adminKickDevice()">Odadan At</button>
          </div>
        </div>
        <div id="admDevicesList"></div>
      </div>

      <!-- Sekme 3: Aktif Odalar Kontrolü -->
      <div class="adm-sec" id="tabSec-rooms">
        <div class="adm-row" style="margin-bottom:10px;">
          <button class="adm-btn-danger" onclick="adminClearAllRooms()">Tüm Odaları Kapat</button>
        </div>
        <div id="admRoomsList"></div>
      </div>

      <!-- Sekme 4: Oyun İçi Lobi Sohbeti Tam Kontrolü -->
      <div class="adm-sec" id="tabSec-chat">
        <div class="adm-row" style="margin-bottom:10px;">
          <input type="text" class="adm-inp" id="admChatInp" style="flex:1;" placeholder="[ADMIN] Turgut Efe olarak lobi sohbetine yaz...">
          <button class="adm-btn" onclick="adminSendChat()">Gönder</button>
          <button class="adm-btn-danger" onclick="adminClearChat()">Sohbeti Temizle</button>
        </div>
        <div id="admChatList"></div>
      </div>
    </div>
  </div>
</div>
<script>
const LANG_DICT = {
  tr: {
    srvStatus: 'TR-EU SUNUCU ÇEVRİMİÇİ',
    srvMaint: 'SUNUCU BAKIM MODUNDA',
    noticeTag: 'DUYURU',
    heroSub: 'Definitive Edition 2.01 Çok Oyunculu Resmi Lobi & Sunucu Merkezi',
    dlBtnText: 'Download APK (405 MB)',
    tgBtnText: 'Telegram Kanalı (@Ageofmultiplayer)',
    lobbyTitle: 'Canlı Çok Oyunculu Lobiler',
    liveTag: 'CANLI',
    searchPh: 'Lobi, kod veya senaryo ara...',
    refreshBtn: 'Yenile',
    thHost: 'Oda Kurucusu (Host)',
    thCode: 'Oda Kodu',
    thMap: 'Harita',
    thScen: 'Senaryo',
    thTurn: 'Tur',
    thPlayers: 'Oyuncular',
    thStatus: 'Durum',
    pingLbl: 'Sunucu Ping',
    pingGreat: 'Mükemmel Gecikme',
    pingGood: 'İyi Bağlantı',
    pingHigh: 'Yüksek Gecikme',
    pingWait: 'Ölçülüyor...',
    roomsLbl: 'Aktif Odalar',
    pubSub: function(n) { return n + ' herkese açık lobi'; },
    playersLbl: 'Oyuncular',
    playersSub: 'Tekil aktif cihaz',
    uptimeLbl: 'Çalışma Süresi',
    uptimeSub: '7/24 Kesintisiz Relay',
    minUnit: 'dk',
    hrUnit: 'sa',
    emptyTitle: 'Şu anda aktif açık oda bulunmuyor',
    emptyDesc: 'Oyundan "Çok oyunculu oyna → Oyun kur" diyerek ilk odayı açabilirsiniz.',
    noMatchTitle: 'Aramanızla eşleşen oda bulunamadı',
    noMatchDesc: 'Farklı bir kurucu adı, oda kodu, harita veya senaryo yazarak tekrar deneyin.',
    turnFmt: function(t) { return 'Tur ' + t; },
    playerFmt: function(p) { return p + ' Oyuncu'; },
    openTag: 'Herkese Açık',
    lockTag: 'Şifreli',
    g1Title: '1. Oda Kurma',
    g1Desc: 'Oyunda Çok Oyunculu → Oyun Kur menüsünden TR-EU sunucusunu seçip 6 haneli oda kodunu oluşturun.',
    g2Title: '2. Lobiye Katılma',
    g2Desc: 'Sunucu listesinden açık odalara tek dokunuşla girin veya arkadaşınızın oda kodunu yazın.',
    g3Title: '3. Kalıcı Kimlik & Senkron',
    g3Desc: 'Her cihaz kalıcı AOH kimliği ile korunur; diplomasi, savaş ve tur geçişleri anlık eşitlenir.',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  },
  en: {
    srvStatus: 'TR-EU SERVER ONLINE',
    srvMaint: 'SERVER IN MAINTENANCE',
    noticeTag: 'NOTICE',
    heroSub: 'Definitive Edition 2.01 Official Multiplayer Lobby & Relay Hub',
    dlBtnText: 'Download APK (405 MB)',
    tgBtnText: 'Telegram Channel (@Ageofmultiplayer)',
    lobbyTitle: 'Live Multiplayer Lobbies',
    liveTag: 'LIVE',
    searchPh: 'Search host, code, scenario...',
    refreshBtn: 'Refresh',
    thHost: 'Room Host',
    thCode: 'Room Code',
    thMap: 'Map',
    thScen: 'Scenario',
    thTurn: 'Turn',
    thPlayers: 'Players',
    thStatus: 'Status',
    pingLbl: 'Server Ping',
    pingGreat: 'Excellent Latency',
    pingGood: 'Good Connection',
    pingHigh: 'High Latency',
    pingWait: 'Measuring...',
    roomsLbl: 'Active Rooms',
    pubSub: function(n) { return n + ' public lobbies'; },
    playersLbl: 'Players',
    playersSub: 'Unique active devices',
    uptimeLbl: 'Server Uptime',
    uptimeSub: '24/7 Dedicated Relay',
    minUnit: 'm',
    hrUnit: 'h',
    emptyTitle: 'No active public lobbies right now',
    emptyDesc: 'Open the game and select "Multiplayer → Host Game" to start the first room.',
    noMatchTitle: 'No lobbies match your search',
    noMatchDesc: 'Try searching with a different host name, code, map, or scenario.',
    turnFmt: function(t) { return 'Turn ' + t; },
    playerFmt: function(p) { return p + (p === 1 ? ' Player' : ' Players'); },
    openTag: 'Public',
    lockTag: 'Password',
    g1Title: '1. Host a Room',
    g1Desc: 'Select TR-EU in Multiplayer → Host Game to generate your 6-character room code.',
    g2Title: '2. Join a Lobby',
    g2Desc: 'Tap any open room in the server list or enter your friend’s room code directly.',
    g3Title: '3. Permanent ID & Sync',
    g3Desc: 'Every device keeps a permanent AOH ID; diplomacy, wars, and turns sync in real time.',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  },
  ru: {
    srvStatus: 'СЕРВЕР TR-EU ОНЛАЙН',
    srvMaint: 'ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ',
    noticeTag: 'ОБЪЯВЛЕНИЕ',
    heroSub: 'Definitive Edition 2.01 Официальный центр сетевых лобби и ретрансляции',
    dlBtnText: 'Скачать APK (405 MB)',
    tgBtnText: 'Telegram Канал (@Ageofmultiplayer)',
    lobbyTitle: 'Активные сетевые лобби',
    liveTag: 'В ЭФИРЕ',
    searchPh: 'Поиск хоста, кода или карты...',
    refreshBtn: 'Обновить',
    thHost: 'Создатель (Хост)',
    thCode: 'Код комнаты',
    thMap: 'Карта',
    thScen: 'Сценарий',
    thTurn: 'Ход',
    thPlayers: 'Игроки',
    thStatus: 'Доступ',
    pingLbl: 'Пинг сервера',
    pingGreat: 'Отличный пинг',
    pingGood: 'Хорошее соединение',
    pingHigh: 'Высокий пинг',
    pingWait: 'Измерение...',
    roomsLbl: 'Активные комнаты',
    pubSub: function(n) { return n + ' открытых лобби'; },
    playersLbl: 'Игроки',
    playersSub: 'Активные устройства',
    uptimeLbl: 'Время работы',
    uptimeSub: 'Стабильный ретранслятор 24/7',
    minUnit: 'мин',
    hrUnit: 'ч',
    emptyTitle: 'Сейчас нет активных открытых комнат',
    emptyDesc: 'Зайдите в игру и выберите «Сетевая игра → Создать игру», чтобы открыть лобби.',
    noMatchTitle: 'Подходящих комнат не найдено',
    noMatchDesc: 'Попробуйте изменить имя создателя, код комнаты, карту или сценарий.',
    turnFmt: function(t) { return 'Ход ' + t; },
    playerFmt: function(p) { return p + ' игр.'; },
    openTag: 'Открыто',
    lockTag: 'Пароль',
    g1Title: '1. Создание комнаты',
    g1Desc: 'Выберите регион TR-EU в меню «Сетевая игра → Создать игру» и получите код.',
    g2Title: '2. Вход в лобби',
    g2Desc: 'Выберите комнату из списка серверов или введите 6-значный код друга.',
    g3Title: '3. Постоянный ID и синхронизация',
    g3Desc: 'Каждое устройство получает постоянный AOH ID; дипломатия и ходы синхронизируются мгновенно.',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  }
};
let curLang = localStorage.getItem('aoh2_web_lang') || 'tr';
if (!LANG_DICT[curLang]) curLang = 'tr';
let lastPayload = null;
let isFetching = false;
let savedAdminPass = sessionStorage.getItem('aoh2_adm_pass') || '';

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, function(ch) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch];
  });
}

function setLang(code) {
  if (!LANG_DICT[code]) return;
  curLang = code;
  localStorage.setItem('aoh2_web_lang', code);
  document.documentElement.lang = code;

  ['tr', 'en', 'ru'].forEach(function(c) {
    const btn = document.getElementById('btn-' + c);
    if (btn) btn.classList.toggle('active', c === code);
  });

  const t = LANG_DICT[code];
  document.getElementById('tNoticeTag').textContent = t.noticeTag;
  document.getElementById('tHeroSub').textContent = t.heroSub;
  document.getElementById('dlBtnText').textContent = t.dlBtnText;
  document.getElementById('tgBtnText').textContent = t.tgBtnText;
  document.getElementById('tLobbyTitle').textContent = t.lobbyTitle;
  document.getElementById('tLiveTag').textContent = t.liveTag;
  document.getElementById('searchInp').placeholder = t.searchPh;
  document.getElementById('tRefreshBtn').textContent = t.refreshBtn;
  document.getElementById('thHost').textContent = t.thHost;
  document.getElementById('thCode').textContent = t.thCode;
  document.getElementById('thMap').textContent = t.thMap;
  document.getElementById('thScen').textContent = t.thScen;
  document.getElementById('thTurn').textContent = t.thTurn;
  document.getElementById('thPlayers').textContent = t.thPlayers;
  document.getElementById('thStatus').textContent = t.thStatus;
  document.getElementById('tPingLbl').textContent = t.pingLbl;
  document.getElementById('tRoomsLbl').textContent = t.roomsLbl;
  document.getElementById('tPlayersLbl').textContent = t.playersLbl;
  document.getElementById('sPlayers').textContent = t.playersSub;
  document.getElementById('tUptimeLbl').textContent = t.uptimeLbl;
  document.getElementById('sUptime').textContent = t.uptimeSub;
  document.getElementById('g1Title').textContent = t.g1Title;
  document.getElementById('g1Desc').textContent = t.g1Desc;
  document.getElementById('g2Title').textContent = t.g2Title;
  document.getElementById('g2Desc').textContent = t.g2Desc;
  document.getElementById('g3Title').textContent = t.g3Title;
  document.getElementById('g3Desc').textContent = t.g3Desc;
  document.getElementById('tFooter').textContent = t.footer;

  if (lastPayload) {
    renderAll(lastPayload.data, lastPayload.ms);
  }
}

function applyFilter() {
  if (lastPayload) {
    renderAll(lastPayload.data, lastPayload.ms);
  }
}

function formatUptime(sec, t) {
  const safeSec = Math.max(0, Number(sec) || 0);
  const mins = Math.floor(safeSec / 60);
  if (mins < 60) {
    return mins + ' ' + t.minUnit;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return hrs + ' ' + t.hrUnit + ' ' + remMins + ' ' + t.minUnit;
}

function renderAll(data, ms) {
  const t = LANG_DICT[curLang];

  const srvDot = document.getElementById('srvDot');
  const srvTxt = document.getElementById('tSrvStatus');
  if (data.maintenanceMode) {
    srvDot.classList.add('maint');
    srvTxt.textContent = t.srvMaint;
  } else {
    srvDot.classList.remove('maint');
    srvTxt.textContent = t.srvStatus;
  }

  const noticeText = document.getElementById('noticeText');
  if (data.announcement && data.announcement !== '/') {
    noticeText.textContent = data.announcement;
  }

  const pingEl = document.getElementById('vPing');
  const pingSub = document.getElementById('sPing');
  const pingBar = document.getElementById('pingBar');
  pingEl.textContent = ms + ' ms';

  if (ms <= 120) {
    pingSub.textContent = t.pingGreat;
    pingSub.style.color = '#2ecc71';
    pingBar.style.width = '24%';
    pingBar.style.background = '#2ecc71';
  } else if (ms <= 250) {
    pingSub.textContent = t.pingGood;
    pingSub.style.color = '#f1c40f';
    pingBar.style.width = '56%';
    pingBar.style.background = '#f1c40f';
  } else {
    pingSub.textContent = t.pingHigh;
    pingSub.style.color = '#e74c3c';
    pingBar.style.width = '88%';
    pingBar.style.background = '#e74c3c';
  }

  document.getElementById('vRooms').textContent = Number(data.activeRooms) || 0;
  document.getElementById('sRooms').textContent = t.pubSub(Number(data.publicRooms) || 0);
  document.getElementById('vPlayers').textContent = Number(data.activePlayers) || 0;
  document.getElementById('vUptime').textContent = formatUptime(data.uptimeSec, t);

  const tbody = document.getElementById('lobbyBody');
  const allLobbies = Array.isArray(data.lobbies) ? data.lobbies : [];

  if (allLobbies.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-row"><strong>' +
      esc(t.emptyTitle) +
      '</strong>' +
      esc(t.emptyDesc) +
      '</td></tr>';
    return;
  }

  const q = (document.getElementById('searchInp').value || '').trim().toLowerCase();
  const filtered = q
    ? allLobbies.filter(function(x) {
        return (x.hostNick || '').toLowerCase().includes(q) ||
          (x.code || '').toLowerCase().includes(q) ||
          (x.mapName || '').toLowerCase().includes(q) ||
          (x.scenarioName || '').toLowerCase().includes(q);
      })
    : allLobbies;

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-row"><strong>' +
      esc(t.noMatchTitle) +
      '</strong>' +
      esc(t.noMatchDesc) +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(item) {
    const letter = esc((item.hostNick || 'H').charAt(0).toUpperCase());
    const vipBadge = item.hostIsVip ? ' <span class="vip-tag">VIP</span>' : '';
    const stBadge = item.hasPass
      ? '<span class="tag-lock">' + esc(t.lockTag) + '</span>'
      : '<span class="tag-open">' + esc(t.openTag) + '</span>';
    return (
      '<tr>' +
        '<td><div class="host-wrap"><span class="av">' + letter + '</span><span>' + esc(item.hostNick) + vipBadge + '</span></div></td>' +
        '<td><span class="code-pill">' + esc(item.code || '------') + '</span></td>' +
        '<td><span class="tag-map">' + esc(item.mapName) + '</span></td>' +
        '<td><strong>' + esc(item.scenarioName) + '</strong></td>' +
        '<td><span class="tag-turn">' + esc(t.turnFmt(item.turn)) + '</span></td>' +
        '<td>&#128100; ' + esc(t.playerFmt(item.players)) + '</td>' +
        '<td>' + stBadge + '</td>' +
      '</tr>'
    );
  }).join('');
}

async function fetchLobby() {
  if (isFetching) return;
  isFetching = true;
  const t0 = performance.now();
  try {
    const res = await fetch('/api/lobby', { cache: 'no-store' });
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const data = await res.json();
    lastPayload = { data, ms };
    renderAll(data, ms);
  } catch (err) {
    document.getElementById('sPing').textContent = LANG_DICT[curLang].pingWait;
  } finally {
    isFetching = false;
  }
}
/* Admin Tam Kontrol Merkezi Fonksiyonları */
let activeAdminTab = 'general';

function switchAdminTab(tabName) {
  activeAdminTab = tabName;
  ['general', 'devices', 'rooms', 'chat'].forEach(function(t) {
    const btn = document.getElementById('tabBtn-' + t);
    const sec = document.getElementById('tabSec-' + t);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (sec) sec.classList.toggle('active', t === tabName);
  });
}

function openAdminModal() {
  document.getElementById('adminModal').classList.add('open');
  if (savedAdminPass) {
    document.getElementById('adminPassInp').value = savedAdminPass;
    adminLogin();
  }
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('open');
}

async function callAdminApi(payload) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function adminLogin() {
  const pass = document.getElementById('adminPassInp').value.trim();
  const errEl = document.getElementById('adminLoginErr');
  errEl.textContent = '';

  try {
    const data = await callAdminApi({ password: pass, action: 'status' });
    if (!data || !data.ok) {
      errEl.textContent = 'Hatalı yönetici şifresi!';
      sessionStorage.removeItem('aoh2_adm_pass');
      savedAdminPass = '';
      return;
    }

    savedAdminPass = pass;
    sessionStorage.setItem('aoh2_adm_pass', pass);
    document.getElementById('adminLoginBox').style.display = 'none';
    document.getElementById('adminPanelBox').style.display = 'block';
    populateAdminView(data);
  } catch (e) {
    errEl.textContent = 'Sunucuya bağlanılamadı!';
  }
}

async function refreshAdminData() {
  if (!savedAdminPass) return;
  const data = await callAdminApi({ password: savedAdminPass, action: 'status' });
  if (data && data.ok) {
    populateAdminView(data);
  }
}

function selectTargetDevice(devId) {
  document.getElementById('admTargetDevInp').value = devId;
  document.getElementById('admAlertTextInp').focus();
}

function populateAdminView(data) {
  if (data.state) {
    document.getElementById('admNoticeInp').value = data.state.announcement || '';
    document.getElementById('admMaintChk').checked = Boolean(data.state.maintenanceMode);
  }

  /* 1. Cihaz ID Takip & Oyuncu Kontrol Listesi */
  const devices = Array.isArray(data.devices) ? data.devices : [];
  document.getElementById('admDevCount').textContent = devices.length;
  const devBox = document.getElementById('admDevicesList');

  if (devices.length === 0) {
    devBox.innerHTML = '<div style="font-size:12px;color:#8a9bb5;">Henüz kayıtlı cihaz bulunmuyor.</div>';
  } else {
    devBox.innerHTML = devices.map(function(d) {
      const dot = d.online ? '<span class="dot-on"></span>' : '<span class="dot-off"></span>';
      const vipBadge = d.vip ? ' <span class="vip-tag">VIP</span>' : '';
      const banBadge = d.banned ? ' <span class="tag-lock">BANLI</span>' : '';
      const banBtnText = d.banned ? 'Ban Kaldır' : 'Banla';
      const vipBtnText = d.vip ? 'VIP Al' : 'VIP Ver';
      return (
        '<div class="adm-item">' +
          '<div>' +
            dot + '<strong>' + esc(d.nick) + '</strong>' + vipBadge + banBadge +
            ' <span class="code-pill">' + esc(d.deviceId) + '</span><br>' +
            '<span style="color:#8a9bb5;font-size:10px;">Durum: ' + esc(d.statusText || '-') + ' | Oda: ' + esc(d.lastRoom || '-') + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
            '<button class="adm-btn-sec" data-id="' + esc(d.deviceId) + '" onclick="selectTargetDevice(this.dataset.id)">Seç</button>' +
            '<button class="adm-btn-vip" data-id="' + esc(d.deviceId) + '" onclick="adminToggleVip(this.dataset.id)">' + vipBtnText + '</button>' +
            '<button class="adm-btn-danger" data-id="' + esc(d.deviceId) + '" onclick="adminToggleBan(this.dataset.id)">' + banBtnText + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* 2. Aktif Odalar Listesi */
  const roomsList = Array.isArray(data.rooms) ? data.rooms : [];
  document.getElementById('admRoomCount').textContent = roomsList.length;
  const roomBox = document.getElementById('admRoomsList');

  if (roomsList.length === 0) {
    roomBox.innerHTML = '<div style="font-size:12px;color:#8a9bb5;">Şu anda sunucuda açık oda yok.</div>';
  } else {
    roomBox.innerHTML = roomsList.map(function(r) {
      return (
        '<div class="adm-item">' +
          '<div>' +
            '<strong>[' + esc(r.code) + '] ' + esc(r.hostNick) + '</strong> <span class="code-pill">' + esc(r.hostId) + '</span><br>' +
            '<span style="color:#8a9bb5;font-size:10px;">' + esc(r.mapName) + ' &bull; ' + esc(r.scenarioName) + ' &bull; Tur ' + r.turn + ' &bull; ' + r.players + ' Oyuncu</span>' +
          '</div>' +
          '<button class="adm-btn-danger" data-code="' + esc(r.code) + '" onclick="adminKickRoom(this.dataset.code)">Odayı Kapat</button>' +
        '</div>'
      );
    }).join('');
  }

  /* 3. Oyun İçi Lobi Sohbeti Moderasyonu */
  const chatList = Array.isArray(data.chat) ? data.chat : [];
  const chatBox = document.getElementById('admChatList');

  if (chatList.length === 0) {
    chatBox.innerHTML = '<div style="font-size:12px;color:#8a9bb5;">Sohbet geçmişi boş.</div>';
  } else {
    chatBox.innerHTML = chatList.slice().reverse().map(function(m) {
      const roleTag = m.isAdmin ? '<span class="vip-tag">ADMIN</span> ' : (m.isVip ? '<span class="vip-tag">VIP</span> ' : '');
      return (
        '<div class="adm-item">' +
          '<div style="max-width:82%;word-break:break-word;">' +
            roleTag + '<strong>' + esc(m.nick) + '</strong> <span style="color:#8a9bb5;font-size:10px;">(' + esc(m.deviceId) + ')</span>: ' +
            '<span>' + esc(m.text) + '</span>' +
          '</div>' +
          '<button class="adm-btn-danger" data-mid="' + esc(m.id) + '" onclick="adminDeleteChat(this.dataset.mid)">Sil</button>' +
        '</div>'
      );
    }).join('');
  }
}

async function saveAdminSettings() {
  const msgEl = document.getElementById('adminSaveMsg');
  msgEl.style.color = '#f7d97e';
  msgEl.textContent = 'Kaydediliyor ve yayınlanıyor...';

  try {
    const data = await callAdminApi({
      password: savedAdminPass,
      action: 'update_settings',
      announcement: document.getElementById('admNoticeInp').value,
      maintenanceMode: document.getElementById('admMaintChk').checked
    });

    if (data && data.ok) {
      msgEl.style.color = '#2ecc71';
      msgEl.textContent = 'Bildirim yayınlandı! Tüm oyuncuların ana menü bilgi penceresinde görünecek.';
      populateAdminView(data);
      fetchLobby();
    } else {
      msgEl.style.color = '#ff7675';
      msgEl.textContent = 'Yetkisiz işlem veya hata!';
    }
  } catch (e) {
    msgEl.style.color = '#ff7675';
    msgEl.textContent = 'Sunucu bağlantı hatası!';
  }
}

async function adminSendAlert() {
  const devId = document.getElementById('admTargetDevInp').value.trim();
  const msg = document.getElementById('admAlertTextInp').value.trim();
  if (!devId || !msg) return;
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'send_alert',
    deviceId: devId,
    message: msg
  });
  if (data && data.ok) {
    document.getElementById('admAlertTextInp').value = '';
    populateAdminView(data);
  }
}

async function adminKickDevice() {
  const devId = document.getElementById('admTargetDevInp').value.trim();
  if (!devId) return;
  const msg = document.getElementById('admAlertTextInp').value.trim();
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'kick_device',
    deviceId: devId,
    message: msg
  });
  if (data && data.ok) {
    populateAdminView(data);
    fetchLobby();
  }
}

async function adminToggleBan(devId) {
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'toggle_ban',
    deviceId: devId
  });
  if (data && data.ok) {
    populateAdminView(data);
    fetchLobby();
  }
}

async function adminToggleVip(devId) {
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'toggle_vip',
    deviceId: devId
  });
  if (data && data.ok) {
    populateAdminView(data);
    fetchLobby();
  }
}

async function adminKickRoom(code) {
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'kick_room',
    code: code
  });
  if (data && data.ok) {
    populateAdminView(data);
    fetchLobby();
  }
}

async function adminClearAllRooms() {
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'clear_all_rooms'
  });
  if (data && data.ok) {
    populateAdminView(data);
    fetchLobby();
  }
}

async function adminSendChat() {
  const inp = document.getElementById('admChatInp');
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = '';
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'admin_chat',
    text: txt
  });
  if (data && data.ok) {
    populateAdminView(data);
  }
}

async function adminDeleteChat(msgId) {
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'delete_chat',
    msgId: msgId
  });
  if (data && data.ok) {
    populateAdminView(data);
  }
}

async function adminClearChat() {
  const data = await callAdminApi({
    password: savedAdminPass,
    action: 'clear_chat'
  });
  if (data && data.ok) {
    populateAdminView(data);
  }
}

setLang(curLang);
fetchLobby();
setInterval(fetchLobby, 3500);
</script>
</body>
</html>`;
}

module.exports = { renderWebPage };
