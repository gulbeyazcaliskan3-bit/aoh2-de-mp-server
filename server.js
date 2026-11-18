const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const MAX_ROOMS = 1000;
const JOIN_TIMEOUT_MS = 25000;
const HEARTBEAT_INTERVAL_MS = 15000;

const rooms = new Map();
const waiting = new Map();
const games = new Map();
let nextClientId = 1;
let totalConnectionsServed = 0;
let totalRoomsCreated = 0;
const startTime = Date.now();

function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function parseInfo(line) {
  if (!line) return null;
  const p = line.split('\t');
  if (p.length !== 7 || p.at(0) !== 'I' || p.at(1) !== '1') return null;
  if (!/^$/.test(p.at(2)) || !/^[0-9]{1,3}$/.test(p.at(3)) || !/^[0-9]{1,6}$/.test(p.at(4))) {
    return null;
  }
  const hasPass = p.at(2) === '1';
  const players = Math.max(1, Number(p.at(3)) || 1);
  const turn = Math.max(1, Number(p.at(4)) || 1);
  const rawMap = p.at(5).replace(/[\x00-\x1f]/g, '').trim().slice(0, 60);
  const hostNick = p.at(6).replace(/[\x00-\x1f]/g, '').trim().slice(0, 32) || 'Host';

  let mapName = 'Earth';
  let scenarioName = rawMap || '1440';
  if (rawMap.includes(' - ')) {
    const idx = rawMap.indexOf(' - ');
    mapName = rawMap.slice(0, idx).trim() || 'Earth';
    scenarioName = rawMap.slice(idx + 3).trim() || '1440';
  } else if (rawMap.includes('|')) {
    const idx = rawMap.indexOf('|');
    mapName = rawMap.slice(0, idx).trim() || 'Earth';
    scenarioName = rawMap.slice(idx + 1).trim() || '1440';
  }

  return {
    raw: `${p.at(1)}\t${p.at(2)}\t${p.at(3)}\t${p.at(4)}\t${rawMap}\t${hostNick}`,
    hasPass,
    players,
    turn,
    mapName,
    scenarioName,
    hostNick,
    updatedAt: Date.now()
  };
}

function renderHtmlPage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AoH2 DE — Turgut Edition Multiplayer</title>
<style>
  :root {
    --bg: #060a12;
    --panel: rgba(14, 22, 38, 0.95);
    --panel-header: #131f36;
    --gold: #d4af37;
    --gold-light: #f5d77f;
    --gold-dim: rgba(212, 175, 55, 0.25);
    --text: #eaf0f8;
    --muted: #8b9bb4;
    --green: #2ecc71;
    --yellow: #f1c40f;
    --red: #e74c3c;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(ellipse at top, #172747 0%, var(--bg) 65%);
    background-color: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 14px 12px 36px;
  }
  .container { max-width: 1080px; margin: 0 auto; }
  .topbar-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
  }
  .brand-mini {
    font-size: 12px;
    font-weight: 700;
    color: var(--gold-light);
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pulse-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: pulse 1.6s infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .lang-group { display: flex; gap: 4px; }
  .lang-btn {
    background: rgba(14, 22, 38, 0.9);
    border: 1px solid var(--gold-dim);
    color: var(--muted);
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .lang-btn.active, .lang-btn:hover {
    border-color: var(--gold);
    color: var(--gold-light);
    background: rgba(212, 175, 55, 0.18);
  }
  .hero {
    background: linear-gradient(180deg, rgba(22, 35, 62, 0.95), rgba(10, 16, 29, 0.98));
    border: 1px solid var(--gold-dim);
    border-radius: 12px;
    padding: 18px 16px;
    text-align: center;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
    margin-bottom: 14px;
  }
  h1 {
    font-size: clamp(18px, 3.8vw, 28px);
    color: var(--gold-light);
    letter-spacing: 0.6px;
    margin-bottom: 4px;
  }
  .hero-sub { color: var(--muted); font-size: 12px; }
  .lobby-panel {
    background: var(--panel);
    border: 1px solid var(--gold);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    margin-bottom: 14px;
  }
  .lobby-topbar {
    padding: 12px 14px;
    background: var(--panel-header);
    border-bottom: 1px solid var(--gold-dim);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .lobby-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--gold-light);
  }
  .live-tag {
    background: rgba(231, 76, 60, 0.2);
    border: 1px solid rgba(231, 76, 60, 0.45);
    color: #ff7675;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 5px;
    text-transform: uppercase;
  }
  .controls { display: flex; align-items: center; gap: 8px; }
  .auto-text { font-size: 11px; color: var(--muted); }
  .btn-gold {
    background: rgba(212, 175, 55, 0.16);
    border: 1px solid var(--gold);
    color: var(--gold-light);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .btn-gold:hover { background: rgba(212, 175, 55, 0.3); }
  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th {
    padding: 10px 12px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    background: rgba(6, 10, 18, 0.55);
    border-bottom: 1px solid var(--gold-dim);
    white-space: nowrap;
  }
  td {
    padding: 11px 12px;
    font-size: 13px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    vertical-align: middle;
    white-space: nowrap;
  }
  tr:hover td { background: rgba(212, 175, 55, 0.04); }
  .host-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #fff; }
  .avatar {
    width: 26px; height: 26px; border-radius: 6px;
    background: linear-gradient(135deg, #d4af37, #8a6d1b);
    color: #070b14; font-weight: 800; font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .map-badge {
    display: inline-block;
    background: rgba(52, 152, 219, 0.15);
    border: 1px solid rgba(52, 152, 219, 0.35);
    color: #74b9ff;
    padding: 2px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
  }
  .scen-text { font-weight: 600; color: var(--text); font-size: 12px; }
  .turn-badge {
    display: inline-block;
    background: rgba(212, 175, 55, 0.15);
    border: 1px solid var(--gold-dim);
    color: var(--gold-light);
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }
  .player-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 255, 255, 0.06);
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
  }
  .status-open {
    background: rgba(46, 204, 113, 0.15);
    border: 1px solid rgba(46, 204, 113, 0.35);
    color: #55efc4;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-lock {
    background: rgba(231, 76, 60, 0.15);
    border: 1px solid rgba(231, 76, 60, 0.35);
    color: #ff7675;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .empty-state {
    text-align: center;
    padding: 30px 14px;
    color: var(--muted);
    font-size: 12px;
    white-space: normal;
  }
  .empty-state strong { display: block; color: var(--gold-light); font-size: 14px; margin-bottom: 4px; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  @media (min-width: 720px) {
    .stats-grid { grid-template-columns: repeat(4, 1fr); }
  }
  .stat-card {
    background: var(--panel);
    border: 1px solid var(--gold-dim);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .stat-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .stat-value { font-size: 18px; font-weight: 800; color: var(--gold-light); margin-bottom: 2px; }
  .stat-foot { font-size: 11px; color: var(--muted); }
  .ping-bar-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; margin-top: 6px; overflow: hidden; }
  .ping-bar-fill { height: 100%; width: 20%; background: var(--green); border-radius: 99px; transition: width 0.4s ease, background 0.4s ease; }
  footer {
    text-align: center;
    margin-top: 18px;
    font-size: 11px;
    color: var(--muted);
  }
</style>
</head>
<body>
<div class="container">
  <div class="topbar-nav">
    <div class="brand-mini"><span class="pulse-dot"></span> <span id="tOnlineRegion">TR-EU SUNUCU AKTİF</span></div>
    <div class="lang-group">
      <button class="lang-btn active" id="btn-tr" onclick="setLang('tr')">TR</button>
      <button class="lang-btn" id="btn-en" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-ru" onclick="setLang('ru')">RU</button>
    </div>
  </div>

  <section class="hero">
    <h1>AGE OF HISTORY II — TURGUT EDITION</h1>
    <p class="hero-sub" id="tHeroSub">Definitive Edition 2.01 Çok Oyunculu Resmi Lobi &amp; Sunucu Merkezi</p>
  </section>

  <section class="lobby-panel">
    <div class="lobby-topbar">
      <div class="lobby-heading">
        <span id="tLobbyTitle">Canlı Çok Oyunculu Lobiler</span>
        <span class="live-tag" id="tLiveTag">CANLI</span>
      </div>
      <div class="controls">
        <span class="auto-text" id="refreshCountdown">4s</span>
        <button class="btn-gold" id="tRefreshBtn" onclick="fetchLobbyNow()">Yenile</button>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th id="thHost">Oda Kurucusu</th>
            <th id="thMap">Harita</th>
            <th id="thScen">Senaryo</th>
            <th id="thTurn">Tur</th>
            <th id="thPlayers">Oyuncular</th>
            <th id="thAccess">Durum</th>
          </tr>
        </thead>
        <tbody id="lobbyTableBody">
          <tr><td colspan="6" class="empty-state"><strong>...</strong></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="stats-grid">
    <div class="stat-card">
      <div class="stat-label" id="tPingTitle">Sunucu Gecikmesi</div>
      <div class="stat-value" id="pingMs">-- ms</div>
      <div class="stat-foot" id="pingLabel">...</div>
      <div class="ping-bar-bg"><div class="ping-bar-fill" id="pingBar"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-label" id="tRoomsTitle">Aktif Odalar</div>
      <div class="stat-value" id="activeRooms">0</div>
      <div class="stat-foot" id="publicRoomsFoot">0 açık lobi</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" id="tPlayersTitle">Oyuncular</div>
      <div class="stat-value" id="activePlayers">0</div>
      <div class="stat-foot" id="tPlayersSub">Çevrimiçi komutan</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" id="tUptimeTitle">Çalışma Süresi</div>
      <div class="stat-value" id="uptimeText">0 dk</div>
      <div class="stat-foot" id="totalStatsFoot">Toplam 0 oda</div>
    </div>
  </section>

  <footer id="tFooter">Age of History II Definitive Edition — Turgut Edition Multiplayer</footer>
</div>
<script>
const I18N = {
  tr: {
    onlineRegion: 'TR-EU SUNUCU AKTİF',
    heroSub: 'Definitive Edition 2.01 Çok Oyunculu Resmi Lobi & Sunucu Merkezi',
    lobbyTitle: 'Canlı Çok Oyunculu Lobiler',
    liveTag: 'CANLI',
    refreshBtn: 'Yenile',
    thHost: 'Oda Kurucusu',
    thMap: 'Harita',
    thScen: 'Senaryo',
    thTurn: 'Tur',
    thPlayers: 'Oyuncular',
    thAccess: 'Durum',
    pingTitle: 'Sunucu Gecikmesi',
    pingGreat: 'Mükemmel Bağlantı',
    pingGood: 'İyi Bağlantı',
    pingHigh: 'Yüksek Gecikme',
    pingWait: 'Bekleniyor...',
    roomsTitle: 'Aktif Odalar',
    publicRooms: n => n + ' herkese açık lobi',
    playersTitle: 'Oyuncular',
    playersSub: 'Anlık çevrimiçi',
    uptimeTitle: 'Çalışma Süresi',
    totalCreated: n => 'Toplam ' + n + ' oda kuruldu',
    minUnit: 'dk',
    hrUnit: 'sa',
    emptyTitle: 'Şu anda açık oyun bulunmuyor',
    emptyDesc: 'Oyundan "Çok oyunculu oyna → Oyun kur" diyerek ilk lobiyi açabilirsiniz.',
    turnLabel: t => 'Tur ' + t,
    playerCount: p => p + ' Oyuncu',
    openRoom: 'Herkese Açık',
    lockRoom: 'Şifreli',
    countdown: s => s + ' sn',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  },
  en: {
    onlineRegion: 'TR-EU SERVER ONLINE',
    heroSub: 'Definitive Edition 2.01 Official Multiplayer Lobby & Relay Hub',
    lobbyTitle: 'Live Multiplayer Lobbies',
    liveTag: 'LIVE',
    refreshBtn: 'Refresh',
    thHost: 'Room Host',
    thMap: 'Map',
    thScen: 'Scenario',
    thTurn: 'Turn',
    thPlayers: 'Players',
    thAccess: 'Status',
    pingTitle: 'Server Latency',
    pingGreat: 'Excellent Connection',
    pingGood: 'Good Connection',
    pingHigh: 'High Latency',
    pingWait: 'Connecting...',
    roomsTitle: 'Active Rooms',
    publicRooms: n => n + ' public lobbies',
    playersTitle: 'Players',
    playersSub: 'Online right now',
    uptimeTitle: 'Server Uptime',
    totalCreated: n => n + ' total rooms created',
    minUnit: 'm',
    hrUnit: 'h',
    emptyTitle: 'No public games available right now',
    emptyDesc: 'Open the game and select "Multiplayer → Host Game" to create the first lobby.',
    turnLabel: t => 'Turn ' + t,
    playerCount: p => p + (p === 1 ? ' Player' : ' Players'),
    openRoom: 'Public',
    lockRoom: 'Password',
    countdown: s => s + 's',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  },
  ru: {
    onlineRegion: 'СЕРВЕР TR-EU ОНЛАЙН',
    heroSub: 'Definitive Edition 2.01 Официальный центр лобби и ретрансляции',
    lobbyTitle: 'Активные сетевые лобби',
    liveTag: 'В ЭФИРЕ',
    refreshBtn: 'Обновить',
    thHost: 'Создатель',
    thMap: 'Карта',
    thScen: 'Сценарий',
    thTurn: 'Ход',
    thPlayers: 'Игроки',
    thAccess: 'Доступ',
    pingTitle: 'Задержка сервера',
    pingGreat: 'Отличное соединение',
    pingGood: 'Хорошее соединение',
    pingHigh: 'Высокий пинг',
    pingWait: 'Ожидание...',
    roomsTitle: 'Активные комнаты',
    publicRooms: n => n + ' открытых лобби',
    playersTitle: 'Игроки',
    playersSub: 'Сейчас в сети',
    uptimeTitle: 'Время работы',
    totalCreated: n => 'Всего создано: ' + n,
    minUnit: 'мин',
    hrUnit: 'ч',
    emptyTitle: 'Сейчас нет открытых игр',
    emptyDesc: 'Зайдите в игру и выберите «Сетевая игра → Создать игру», чтобы открыть первое лобби.',
    turnLabel: t => 'Ход ' + t,
    playerCount: p => p + ' игр.',
    openRoom: 'Открыто',
    lockRoom: 'Пароль',
    countdown: s => s + ' с',
    footer: 'Age of History II Definitive Edition — Turgut Edition Multiplayer'
  }
};

let currentLang = localStorage.getItem('aoh2_lang') || 'tr';
if (!I18N[currentLang]) currentLang = 'tr';
let countdown = 4;
let lastData = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setLang(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  localStorage.setItem('aoh2_lang', lang);
  document.documentElement.lang = lang;

  ['tr', 'en', 'ru'].forEach(code => {
    document.getElementById('btn-' + code).classList.toggle('active', code === lang);
  });

  const t = I18N[lang];
  document.getElementById('tOnlineRegion').textContent = t.onlineRegion;
  document.getElementById('tHeroSub').textContent = t.heroSub;
  document.getElementById('tLobbyTitle').textContent = t.lobbyTitle;
  document.getElementById('tLiveTag').textContent = t.liveTag;
  document.getElementById('tRefreshBtn').textContent = t.refreshBtn;
  document.getElementById('thHost').textContent = t.thHost;
  document.getElementById('thMap').textContent = t.thMap;
  document.getElementById('thScen').textContent = t.thScen;
  document.getElementById('thTurn').textContent = t.thTurn;
  document.getElementById('thPlayers').textContent = t.thPlayers;
  document.getElementById('thAccess').textContent = t.thAccess;
  document.getElementById('tPingTitle').textContent = t.pingTitle;
  document.getElementById('tRoomsTitle').textContent = t.roomsTitle;
  document.getElementById('tPlayersTitle').textContent = t.playersTitle;
  document.getElementById('tPlayersSub').textContent = t.playersSub;
  document.getElementById('tUptimeTitle').textContent = t.uptimeTitle;
  document.getElementById('tFooter').textContent = t.footer;
  document.getElementById('refreshCountdown').textContent = t.countdown(countdown);

  if (lastData) renderData(lastData.data, lastData.ms);
}

function renderData(data, ms) {
  const t = I18N[currentLang];
  const pingEl = document.getElementById('pingMs');
  const pingLbl = document.getElementById('pingLabel');
  const pingBar = document.getElementById('pingBar');
  pingEl.textContent = ms + ' ms';

  if (ms <= 115) {
    pingLbl.textContent = t.pingGreat;
    pingLbl.style.color = '#2ecc71';
    pingBar.style.width = '25%';
    pingBar.style.background = '#2ecc71';
  } else if (ms <= 245) {
    pingLbl.textContent = t.pingGood;
    pingLbl.style.color = '#f1c40f';
    pingBar.style.width = '58%';
    pingBar.style.background = '#f1c40f';
  } else {
    pingLbl.textContent = t.pingHigh;
    pingLbl.style.color = '#e74c3c';
    pingBar.style.width = '88%';
    pingBar.style.background = '#e74c3c';
  }

  document.getElementById('activeRooms').textContent = data.totalRooms;
  document.getElementById('publicRoomsFoot').textContent = t.publicRooms(data.publicRooms);
  document.getElementById('activePlayers').textContent = data.totalPlayers;
  document.getElementById('totalStatsFoot').textContent = t.totalCreated(data.totalRoomsCreated);

  const mins = Math.floor(data.uptimeSec / 60);
  document.getElementById('uptimeText').textContent = mins < 60
    ? mins + ' ' + t.minUnit
    : Math.floor(mins / 60) + ' ' + t.hrUnit + ' ' + (mins % 60) + ' ' + t.minUnit;

  const tbody = document.getElementById('lobbyTableBody');
  if (!data.lobbies || data.lobbies.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><strong>' + esc(t.emptyTitle) + '</strong>' + esc(t.emptyDesc) + '</td></tr>';
    return;
  }

  tbody.innerHTML = data.lobbies.map(item => {
    const initial = esc((item.hostNick || 'H').charAt(0).toUpperCase());
    const access = item.hasPass
      ? '<span class="status-lock">' + esc(t.lockRoom) + '</span>'
      : '<span class="status-open">' + esc(t.openRoom) + '</span>';
    return '<tr>' +
      '<td><div class="host-cell"><span class="avatar">' + initial + '</span><span>' + esc(item.hostNick) + '</span></div></td>' +
      '<td><span class="map-badge">' + esc(item.mapName) + '</span></td>' +
      '<td><span class="scen-text">' + esc(item.scenarioName) + '</span></td>' +
      '<td><span class="turn-badge">' + esc(t.turnLabel(item.turn)) + '</span></td>' +
      '<td><span class="player-pill">👤 ' + esc(t.playerCount(item.players)) + '</span></td>' +
      '<td>' + access + '</td>' +
    '</tr>';
  }).join('');
}

async function fetchLobbyNow() {
  countdown = 4;
  const t0 = performance.now();
  try {
    const res = await fetch('/api/lobby', { cache: 'no-store' });
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const data = await res.json();
    lastData = { data, ms };
    renderData(data, ms);
  } catch (err) {
    document.getElementById('pingLabel').textContent = I18N[currentLang].pingWait;
  }
}

setLang(currentLang);
fetchLobbyNow();
setInterval(() => {
  countdown--;
  if (countdown <= 0) {
    fetchLobbyNow();
  }
  document.getElementById('refreshCountdown').textContent = I18N[currentLang].countdown(countdown);
}, 1000);
</script>
</body>
</html>`;
}
const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url.startsWith('/config')) {
    const hostHeader = req.headers.host || 'aoh2-de-mp-server.onrender.com';
    const body = `${hostHeader}:443,TR-EU;\n/\n/\n/\n`;
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(body);
    return;
  }

  if (url.startsWith('/api/lobby')) {
    const lobbies = [];
    let totalPlayers = 0;
    let publicRooms = 0;

    for (const [, v] of games.entries()) {
      if (v && v.parsed) {
        lobbies.push({
          hostNick: v.parsed.hostNick,
          mapName: v.parsed.mapName,
          scenarioName: v.parsed.scenarioName,
          turn: v.parsed.turn,
          players: v.parsed.players,
          hasPass: v.parsed.hasPass
        });
        totalPlayers += v.parsed.players;
        publicRooms++;
      }
    }

    if (rooms.size > publicRooms) {
      totalPlayers += (rooms.size - publicRooms);
    }

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({
      totalRooms: rooms.size,
      publicRooms,
      totalPlayers,
      totalRoomsCreated,
      totalConnectionsServed,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      lobbies
    }));
    return;
  }

  if (url.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      publicRooms: games.size,
      waitingClients: waiting.size,
      uptimeSec: Math.floor((Date.now() - startTime) / 1000)
    }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(renderHtmlPage());
});

const wss = new WebSocketServer({
  server,
  maxPayload: 256 * 1024 * 1024
});

wss.on('connection', (ws) => {
  totalConnectionsServed++;
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  let buffer = Buffer.alloc(0);
  let state = 'HANDSHAKE';
  let roomCode = null;
  let infoKey = null;
  let peerWs = null;

  function sendLine(str) {
    if (ws.readyState === 1) {
      ws.send(Buffer.from(str + '\n', 'utf8'));
    }
  }

  function cleanup() {
    if (roomCode) {
      rooms.delete(roomCode);
      roomCode = null;
    }
    if (infoKey) {
      games.delete(infoKey);
      infoKey = null;
    }
    if (peerWs) {
      const target = peerWs;
      peerWs = null;
      if (target.readyState === 1) {
        try {
          target.close();
        } catch (_) {}
      }
    }
  }

  ws.on('message', (data) => {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);

    if (state === 'PIPE') {
      if (peerWs && peerWs.readyState === 1) {
        peerWs.send(chunk);
      }
      return;
    }

    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > 65536) {
      ws.close();
      return;
    }

    let nlIdx;
    while ((nlIdx = buffer.indexOf(10)) !== -1) {
      const line = buffer.slice(0, nlIdx).toString('utf8').trim();
      buffer = buffer.slice(nlIdx + 1);

      if (state === 'HOST_INFO') {
        if (infoKey && games.has(infoKey)) {
          const entry = games.get(infoKey);
          const parsed = parseInfo(line);
          entry.parsed = parsed;
          entry.info = parsed ? parsed.raw : null;
        }
        continue;
      }

      if (state === 'HANDSHAKE') {
        const parts = line.split(' ');
        const cmd = parts.at(0);

        if (parts.length === 1 && cmd === 'H' && rooms.size < MAX_ROOMS) {
          roomCode = newCode();
          totalRoomsCreated++;
          rooms.set(roomCode, ws);
          infoKey = roomCode;
          games.set(infoKey, { type: 'O', info: null, parsed: null });
          state = 'HOST_INFO';
          sendLine('C ' + roomCode);
        } else if (parts.length === 1 && cmd === 'L') {
          let out = '';
          for (const [k, v] of games.entries()) {
            if (v && v.info) {
              out += `S\t${v.type}\t${k}\t${v.info}\n`;
            }
          }
          out += '.\n';
          if (ws.readyState === 1) {
            ws.send(Buffer.from(out, 'utf8'));
          }
          ws.close();
          return;
        } else if (parts.length === 2 && cmd === 'Q') {
          const code = parts.at(1);
          const hostWs = rooms.get(code);
          const exists = Boolean(hostWs && hostWs.readyState === 1);
          sendLine(exists ? 'Y' : 'N');
          ws.close();
          return;
        } else if (parts.length === 2 && cmd === 'J') {
          const targetCode = parts.at(1);
          const hostWs = rooms.get(targetCode);
          if (!hostWs || hostWs.readyState !== 1) {
            ws.close();
            return;
          }
          const cid = String(nextClientId++);
          const waitKey = `${targetCode} ${cid}`;
          waiting.set(waitKey, ws);
          state = 'WAITING_PIPE';
          hostWs.send(Buffer.from(`N ${cid}\n`, 'utf8'));

          setTimeout(() => {
            if (waiting.has(waitKey)) {
              waiting.delete(waitKey);
              if (ws.readyState === 1) {
                ws.close();
              }
            }
          }, JOIN_TIMEOUT_MS);
          return;
        } else if (parts.length === 3 && cmd === 'D' && rooms.has(parts.at(1))) {
          const waitKey = `${parts.at(1)} ${parts.at(2)}`;
          const clientWs = waiting.get(waitKey);
          waiting.delete(waitKey);
          if (!clientWs || clientWs.readyState !== 1) {
            ws.close();
            return;
          }
          peerWs = clientWs;
          clientWs._setPeer(ws);
          state = 'PIPE';

          if (buffer.length > 0 && peerWs.readyState === 1) {
            peerWs.send(buffer);
            buffer = Buffer.alloc(0);
          }
          return;
        } else {
          ws.close();
          return;
        }
      }
    }
  });

  ws._setPeer = (target) => {
    peerWs = target;
    state = 'PIPE';
    if (buffer.length > 0 && peerWs.readyState === 1) {
      peerWs.send(buffer);
      buffer = Buffer.alloc(0);
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      try {
        ws.terminate();
      } catch (_) {}
      return;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (_) {}
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeat);
});

server.listen(PORT, () => {
  console.log('AoH2DE Turgut Edition MP Web & Relay listening on port ' + PORT);
});


