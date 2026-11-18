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
    --bg-grad: #111d36;
    --panel: rgba(13, 21, 38, 0.96);
    --panel-alt: #121e36;
    --gold: #d4af37;
    --gold-bright: #f7d97e;
    --gold-border: rgba(212, 175, 55, 0.28);
    --text-main: #edf2fa;
    --text-muted: #8a9bb5;
    --green: #2ecc71;
    --yellow: #f1c40f;
    --red: #e74c3c;
    --blue: #3498db;
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
    padding: 12px 10px 40px;
    line-height: 1.45;
  }
  .wrap { max-width: 1080px; margin: 0 auto; }

  /* Üst Navigasyon ve Dil Çubuğu */
  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--panel);
    border: 1px solid var(--gold-border);
    border-radius: 10px;
    padding: 8px 12px;
    margin-bottom: 12px;
    gap: 8px;
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
  @keyframes blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(1.2); } }
  .lang-bar { display: flex; gap: 4px; }
  .lang-btn {
    background: rgba(6, 10, 18, 0.75);
    border: 1px solid var(--gold-border);
    color: var(--text-muted);
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .lang-btn.active, .lang-btn:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
    background: rgba(212, 175, 55, 0.22);
  }

  /* Başlık Kartı */
  .hero {
    background: linear-gradient(180deg, rgba(20, 32, 58, 0.96), rgba(9, 15, 28, 0.98));
    border: 1px solid var(--gold-border);
    border-radius: 12px;
    padding: 16px 14px;
    text-align: center;
    margin-bottom: 12px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
    position: relative;
  }
  .hero::after {
    content: "";
    position: absolute;
    top: 0; left: 15%; right: 15%; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold-bright), transparent);
  }
  .hero h1 {
    font-size: clamp(17px, 3.8vw, 27px);
    color: var(--gold-bright);
    letter-spacing: 0.7px;
    margin-bottom: 4px;
  }
  .hero p { font-size: 12px; color: var(--text-muted); }

  /* Ana Plan: Canlı Lobi Tablosu */
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
    width: 125px;
    outline: none;
  }
  .search-inp:focus { border-color: var(--gold); }
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
  .btn-mini:hover { background: rgba(212, 175, 55, 0.3); }
  .tbl-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th {
    padding: 9px 11px;
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
    padding: 10px 11px;
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

  /* Kompakt 2x2 İstatistik Kartları */
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

  /* Bağlantı Rehberi Kutusu */
  .guide {
    background: var(--panel);
    border: 1px solid var(--gold-border);
    border-radius: 10px;
    padding: 12px 14px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }
  .gstep { background: rgba(5, 8, 16, 0.55); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 9px 11px; }
  .gstep b { display: block; color: var(--gold-bright); font-size: 12px; margin-bottom: 2px; }
  .gstep span { font-size: 11px; color: var(--text-muted); }
  footer { text-align: center; font-size: 11px; color: var(--text-muted); }
</style>
</head>
<body>
<div class="wrap">
  <nav class="nav">
    <div class="srv-status">
      <span class="pulse"></span>
      <span id="tSrvStatus">TR-EU SUNUCU ÇEVRİMİÇİ</span>
    </div>
    <div class="lang-bar">
      <button class="lang-btn active" id="btn-tr" onclick="setLang('tr')">TR</button>
      <button class="lang-btn" id="btn-en" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-ru" onclick="setLang('ru')">RU</button>
    </div>
  </nav>

  <header class="hero">
    <h1>AGE OF HISTORY II — TURGUT EDITION</h1>
    <p id="tHeroSub">Definitive Edition 2.01 Çok Oyunculu Resmi Lobi &amp; Sunucu Merkezi</p>
  </header>

  <section class="lobby-card">
    <div class="lobby-head">
      <div class="lobby-title-wrap">
        <span class="lobby-title" id="tLobbyTitle">Canlı Çok Oyunculu Lobiler</span>
        <span class="live-pill" id="tLiveTag">CANLI</span>
      </div>
      <div class="lobby-actions">
        <input type="text" class="search-inp" id="searchInp" placeholder="Lobi veya harita ara..." oninput="applyFilter()">
        <button class="btn-mini" id="tRefreshBtn" onclick="fetchLobby()">Yenile</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th id="thHost">Oda Kurucusu</th>
            <th id="thMap">Harita</th>
            <th id="thScen">Senaryo</th>
            <th id="thTurn">Tur</th>
            <th id="thPlayers">Oyuncular</th>
            <th id="thStatus">Durum</th>
          </tr>
        </thead>
        <tbody id="lobbyBody">
          <tr><td colspan="6" class="empty-row"><strong>...</strong></td></tr>
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
      <div class="ssub" id="sUptime">Kesintisiz Relay</div>
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
      <b id="g3Title">3. Gerçek Zamanlı Senkron</b>
      <span id="g3Desc">Ülke seçimi, diplomasi, ticaret ve tur geçişleri tüm cihazlarda anlık eşitlenir.</span>
    </div>
  </section>

  <footer id="tFooter">Age of History II Definitive Edition — Turgut Edition Multiplayer</footer>
</div>
<script>
const LANG_DICT = {
  tr: {
    srvStatus: 'TR-EU SUNUCU ÇEVRİMİÇİ',
    heroSub: 'Definitive Edition 2.01 Çok Oyunculu Resmi Lobi & Sunucu Merkezi',
    lobbyTitle: 'Canlı Çok Oyunculu Lobiler',
    liveTag: 'CANLI',
    searchPh: 'Lobi veya harita ara...',
    refreshBtn: 'Yenile',
    thHost: 'Oda Kurucusu',
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
    pubSub: n => n + ' herkese açık lobi',
    playersLbl: 'Oyuncular',
    playersSub: 'Tekil aktif cihaz',
    uptimeLbl: 'Çalışma Süresi',
    uptimeSub: 'Kesintisiz Relay',
    minUnit: 'dk',
    hrUnit: 'sa',
    emptyTitle: 'Şu anda aktif açık oda bulunmuyor',
    emptyDesc: 'Oyundan "Çok oyunculu oyna → Oyun kur" diyerek ilk odayı açabilirsiniz.',
    noMatchTitle: 'Aramanızla eşleşen oda bulunamadı',
    noMatchDesc: 'Farklı bir kurucu adı, harita veya senaryo yazarak tekrar deneyin.',
    turnFmt: t => 'Tur ' + t,
    playerFmt: p => p + ' Oyuncu',
    openTag: 'Herkese Açık',
    lockTag: 'Şifreli',
    g1Title: '1. Oda Kurma',
    g1Desc: 'Oyunda Çok Oyunculu → Oyun Kur menüsünden TR-EU sunucusunu seçip 6 haneli oda kodunu oluşturun.',
    g2Title: '2. Lobiye Katılma',
    g2Desc: 'Sunucu listesinden açık odalara tek dokunuşla girin veya arkadaşınızın oda kodunu yazın.',
    g3Title: '3. Gerçek Zamanlı Senkron',
    g3Desc: 'Ülke seçimi, diplomasi, ticaret ve tur geçişleri tüm cihazlarda anlık eşitlenir.',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  },
  en: {
    srvStatus: 'TR-EU SERVER ONLINE',
    heroSub: 'Definitive Edition 2.01 Official Multiplayer Lobby & Relay Hub',
    lobbyTitle: 'Live Multiplayer Lobbies',
    liveTag: 'LIVE',
    searchPh: 'Search lobby or map...',
    refreshBtn: 'Refresh',
    thHost: 'Room Host',
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
    pubSub: n => n + ' public lobbies',
    playersLbl: 'Players',
    playersSub: 'Unique active devices',
    uptimeLbl: 'Server Uptime',
    uptimeSub: 'Dedicated Relay',
    minUnit: 'm',
    hrUnit: 'h',
    emptyTitle: 'No active public lobbies right now',
    emptyDesc: 'Open the game and select "Multiplayer → Host Game" to start the first room.',
    noMatchTitle: 'No lobbies match your search',
    noMatchDesc: 'Try searching with a different host name, map, or scenario.',
    turnFmt: t => 'Turn ' + t,
    playerFmt: p => p + (p === 1 ? ' Player' : ' Players'),
    openTag: 'Public',
    lockTag: 'Password',
    g1Title: '1. Host a Room',
    g1Desc: 'Select TR-EU in Multiplayer → Host Game to generate your 6-character room code.',
    g2Title: '2. Join a Lobby',
    g2Desc: 'Tap any open room in the server list or enter your friend’s room code directly.',
    g3Title: '3. Real-Time Sync',
    g3Desc: 'Civilization picks, diplomacy, trade, and turns stay synced across all devices.',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  },
  ru: {
    srvStatus: 'СЕРВЕР TR-EU ОНЛАЙН',
    heroSub: 'Definitive Edition 2.01 Официальный центр сетевых лобби и ретрансляции',
    lobbyTitle: 'Активные сетевые лобби',
    liveTag: 'В ЭФИРЕ',
    searchPh: 'Поиск лобби или карты...',
    refreshBtn: 'Обновить',
    thHost: 'Создатель',
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
    pubSub: n => n + ' открытых лобби',
    playersLbl: 'Игроки',
    playersSub: 'Активные устройства',
    uptimeLbl: 'Время работы',
    uptimeSub: 'Стабильный ретранслятор',
    minUnit: 'мин',
    hrUnit: 'ч',
    emptyTitle: 'Сейчас нет активных открытых комнат',
    emptyDesc: 'Зайдите в игру и выберите «Сетевая игра → Создать игру», чтобы открыть лобби.',
    noMatchTitle: 'Подходящих комнат не найдено',
    noMatchDesc: 'Попробуйте изменить имя создателя, карту или сценарий.',
    turnFmt: t => 'Ход ' + t,
    playerFmt: p => p + ' игр.',
    openTag: 'Открыто',
    lockTag: 'Пароль',
    g1Title: '1. Создание комнаты',
    g1Desc: 'Выберите регион TR-EU в меню «Сетевая игра → Создать игру» и получите код.',
    g2Title: '2. Вход в лобби',
    g2Desc: 'Выберите комнату из списка серверов или введите 6-значный код друга.',
    g3Title: '3. Синхронизация',
    g3Desc: 'Выбор стран, дипломатия и ходы мгновенно синхронизируются между игроками.',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  }
};
let curLang = localStorage.getItem('aoh2_web_lang') || 'tr';
if (!LANG_DICT[curLang]) curLang = 'tr';
let lastPayload = null;
let isFetching = false;

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function setLang(code) {
  if (!LANG_DICT[code]) return;
  curLang = code;
  localStorage.setItem('aoh2_web_lang', code);
  document.documentElement.lang = code;

  ['tr', 'en', 'ru'].forEach((c) => {
    const btn = document.getElementById('btn-' + c);
    if (btn) btn.classList.toggle('active', c === code);
  });

  const t = LANG_DICT[code];
  document.getElementById('tSrvStatus').textContent = t.srvStatus;
  document.getElementById('tHeroSub').textContent = t.heroSub;
  document.getElementById('tLobbyTitle').textContent = t.lobbyTitle;
  document.getElementById('tLiveTag').textContent = t.liveTag;
  document.getElementById('searchInp').placeholder = t.searchPh;
  document.getElementById('tRefreshBtn').textContent = t.refreshBtn;
  document.getElementById('thHost').textContent = t.thHost;
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
      '<tr><td colspan="6" class="empty-row"><strong>' +
      esc(t.emptyTitle) +
      '</strong>' +
      esc(t.emptyDesc) +
      '</td></tr>';
    return;
  }

  const q = (document.getElementById('searchInp').value || '').trim().toLowerCase();
  const filtered = q
    ? allLobbies.filter((x) =>
        (x.hostNick || '').toLowerCase().includes(q) ||
        (x.mapName || '').toLowerCase().includes(q) ||
        (x.scenarioName || '').toLowerCase().includes(q)
      )
    : allLobbies;

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-row"><strong>' +
      esc(t.noMatchTitle) +
      '</strong>' +
      esc(t.noMatchDesc) +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((item) => {
    const letter = esc((item.hostNick || 'H').charAt(0).toUpperCase());
    const stBadge = item.hasPass
      ? '<span class="tag-lock">' + esc(t.lockTag) + '</span>'
      : '<span class="tag-open">' + esc(t.openTag) + '</span>';
    return (
      '<tr>' +
        '<td><div class="host-wrap"><span class="av">' + letter + '</span><span>' + esc(item.hostNick) + '</span></div></td>' +
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

setLang(curLang);
fetchLobby();
setInterval(fetchLobby, 3500);
</script>
</body>
</html>`;
}

module.exports = { renderWebPage };

