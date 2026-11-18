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
  if (!/^[01]$/.test(p.at(2)) || !/^[0-9]{1,3}$/.test(p.at(3)) || !/^[0-9]{1,6}$/.test(p.at(4))) {
    return null;
  }
  const hasPass = p.at(2) === '1';
  const players = Math.max(1, Number(p.at(3)) || 1);
  const turn = Math.max(1, Number(p.at(4)) || 1);
  const rawMap = p.at(5).replace(/[\x00-\x1f]/g, '').trim().slice(0, 60);
  const hostNick = p.at(6).replace(/[\x00-\x1f]/g, '').trim().slice(0, 32) || 'Kurucu';

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
<title>AoH2 DE — Turgut Edition Resmi Multiplayer Merkezi</title>
<style>
  :root {
    --bg: #060a12;
    --bg-accent: #0f192e;
    --panel: rgba(14, 22, 38, 0.94);
    --panel-header: #131f36;
    --gold: #d4af37;
    --gold-light: #f5d77f;
    --gold-dim: rgba(212, 175, 55, 0.25);
    --text: #eaf0f8;
    --muted: #8b9bb4;
    --green: #2ecc71;
    --yellow: #f1c40f;
    --red: #e74c3c;
    --blue: #3498db;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background:
      radial-gradient(ellipse at top, #172747 0%, transparent 55%),
      radial-gradient(circle at bottom right, #101b33 0%, var(--bg) 70%);
    background-color: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 20px 14px 48px;
  }
  .container { max-width: 1120px; margin: 0 auto; }
  .hero {
    background: linear-gradient(180deg, rgba(22, 35, 62, 0.95), rgba(10, 16, 29, 0.98));
    border: 1px solid var(--gold-dim);
    border-radius: 16px;
    padding: 30px 24px;
    text-align: center;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65);
    margin-bottom: 22px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold-light), transparent);
  }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(46, 204, 113, 0.12);
    border: 1px solid rgba(46, 204, 113, 0.35);
    color: #7bed9f;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .pulse-dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 12px var(--green);
    animation: pulse 1.6s infinite;
  }
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: 0.5; } }
  h1 {
    font-size: clamp(22px, 4.2vw, 36px);
    color: var(--gold-light);
    letter-spacing: 0.8px;
    margin-bottom: 8px;
    text-shadow: 0 2px 12px rgba(212, 175, 55, 0.25);
  }
  .hero-sub { color: var(--muted); font-size: 14px; max-width: 640px; margin: 0 auto; }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 24px;
  }
  .stat-card {
    background: var(--panel);
    border: 1px solid var(--gold-dim);
    border-radius: 14px;
    padding: 18px 20px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }
  .stat-card:hover { transform: translateY(-2px); border-color: var(--gold); }
  .stat-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .stat-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; }
  .stat-value { font-size: 26px; font-weight: 800; color: var(--gold-light); margin-bottom: 4px; }
  .stat-foot { font-size: 12px; color: var(--muted); }
  .ping-bar-bg { width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 99px; margin-top: 8px; overflow: hidden; }
  .ping-bar-fill { height: 100%; width: 20%; background: var(--green); border-radius: 99px; transition: width 0.4s ease, background 0.4s ease; }


  .lobby-panel {
    background: var(--panel);
    border: 1px solid var(--gold-dim);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5);
  }
  .lobby-topbar {
    padding: 18px 22px;
    background: var(--panel-header);
    border-bottom: 1px solid var(--gold-dim);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .lobby-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    color: var(--gold-light);
  }
  .live-tag {
    background: rgba(231, 76, 60, 0.2);
    border: 1px solid rgba(231, 76, 60, 0.45);
    color: #ff7675;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .controls { display: flex; align-items: center; gap: 10px; }
  .auto-text { font-size: 12px; color: var(--muted); }
  .btn-gold {
    background: linear-gradient(180deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.12));
    border: 1px solid var(--gold);
    color: var(--gold-light);
    padding: 7px 15px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-gold:hover { background: rgba(212, 175, 55, 0.35); }
  .table-scroll { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th {
    padding: 14px 18px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--muted);
    background: rgba(6, 10, 18, 0.55);
    border-bottom: 1px solid var(--gold-dim);
  }
  td {
    padding: 15px 18px;
    font-size: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    vertical-align: middle;
  }
  tr:hover td { background: rgba(212, 175, 55, 0.04); }
  .host-cell { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #fff; }
  .avatar {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, #d4af37, #8a6d1b);
    color: #070b14; font-weight: 800; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .map-badge {
    display: inline-block;
    background: rgba(52, 152, 219, 0.15);
    border: 1px solid rgba(52, 152, 219, 0.35);
    color: #74b9ff;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
  }
  .scen-text { font-weight: 600; color: var(--text); }
  .turn-badge {
    display: inline-block;
    background: rgba(212, 175, 55, 0.15);
    border: 1px solid var(--gold-dim);
    color: var(--gold-light);
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }
  .player-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 10px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
  }
  .status-open {
    background: rgba(46, 204, 113, 0.15);
    border: 1px solid rgba(46, 204, 113, 0.35);
    color: #55efc4;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }
  .status-lock {
    background: rgba(231, 76, 60, 0.15);
    border: 1px solid rgba(231, 76, 60, 0.35);
    color: #ff7675;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }
  .empty-state {
    text-align: center;
    padding: 48px 20px;
    color: var(--muted);
  }
  .empty-state strong { display: block; color: var(--gold-light); font-size: 16px; margin-bottom: 6px; }
  footer {
    text-align: center;
    margin-top: 28px;
    font-size: 12px;
    color: var(--muted);
  }
</style>
</head>
<body>
<div class="container">
  <section class="hero">
    <div class="status-pill"><span class="pulse-dot"></span> Sunucu Aktif • Bölge: TR-EU (İstanbul / Avrupa)</div>
    <h1>AGE OF HISTORY II — TURGUT EDITION</h1>
    <p class="hero-sub">Definitive Edition 2.01 Çok Oyunculu Resmi Lobi Takip &amp; Relay Sunucu Merkezi</p>
  </section>

  <section class="stats-grid">
    <div class="stat-card">
      <div class="stat-top"><span class="stat-label">Sunucu Gecikmesi (Ping)</span></div>
      <div class="stat-value" id="pingMs">-- ms</div>
      <div class="stat-foot" id="pingLabel">Bağlantı ölçülüyor...</div>
      <div class="ping-bar-bg"><div class="ping-bar-fill" id="pingBar"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-label">Aktif Odalar</span></div>
      <div class="stat-value" id="activeRooms">0</div>
      <div class="stat-foot" id="publicRoomsFoot">0 herkese açık lobi</div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-label">Lobideki Oyuncular</span></div>
      <div class="stat-value" id="activePlayers">0</div>
      <div class="stat-foot">Anlık çevrimiçi komutanlar</div>
    </div>
    <div class="stat-card">
      <div class="stat-top"><span class="stat-label">Sunucu Çalışma Süresi</span></div>
      <div class="stat-value" id="uptimeText">0 dk</div>
      <div class="stat-foot" id="totalStatsFoot">Toplam 0 oda kuruldu</div>
    </div>
  </section>

  <section class="lobby-panel">
    <div class="lobby-topbar">
      <div class="lobby-heading">
        <span>Canlı Çok Oyunculu Lobiler</span>
        <span class="live-tag">Canlı</span>
      </div>
      <div class="controls">
        <span class="auto-text" id="refreshCountdown">4 sn içinde yenilenir</span>
        <button class="btn-gold" onclick="fetchLobbyNow()">Şimdi Yenile</button>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Oda Kurucusu (Lobi)</th>
            <th>Harita</th>
            <th>Senaryo</th>
            <th>Tur</th>
            <th>Oyuncular</th>
            <th>Erişim</th>
          </tr>
        </thead>
        <tbody id="lobbyTableBody">
          <tr><td colspan="6" class="empty-state"><strong>Canlı lobi verileri yükleniyor...</strong>Sunucudan aktif odalar sorgulanıyor.</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <footer>Age of History II Definitive Edition — Turgut Edition Multiplayer • Tüm Hakları Saklıdır</footer>
</div>

<script>
let countdown = 4;

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function fetchLobbyNow() {
  countdown = 4;
  const t0 = performance.now();
  try {
    const res = await fetch('/api/lobby', { cache: 'no-store' });
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const data = await res.json();

    const pingEl = document.getElementById('pingMs');
    const pingLbl = document.getElementById('pingLabel');
    const pingBar = document.getElementById('pingBar');
    pingEl.textContent = ms + ' ms';

    if (ms <= 110) {
      pingLbl.textContent = 'Mükemmel Gecikme (Düşük Ping)';
      pingLbl.style.color = '#2ecc71';
      pingBar.style.width = '25%';
      pingBar.style.background = '#2ecc71';
    } else if (ms <= 240) {
      pingLbl.textContent = 'İyi Bağlantı Kalitesi';
      pingLbl.style.color = '#f1c40f';
      pingBar.style.width = '55%';
      pingBar.style.background = '#f1c40f';
    } else {
      pingLbl.textContent = 'Yüksek Gecikme';
      pingLbl.style.color = '#e74c3c';
      pingBar.style.width = '88%';
      pingBar.style.background = '#e74c3c';
    }

    document.getElementById('activeRooms').textContent = data.totalRooms;
    document.getElementById('publicRoomsFoot').textContent = data.publicRooms + ' herkese açık lobi';
    document.getElementById('activePlayers').textContent = data.totalPlayers;
    document.getElementById('totalStatsFoot').textContent = 'Toplam ' + data.totalRoomsCreated + ' oda kuruldu';

    const mins = Math.floor(data.uptimeSec / 60);
    document.getElementById('uptimeText').textContent = mins < 60
      ? mins + ' dk'
      : Math.floor(mins / 60) + ' sa ' + (mins % 60) + ' dk';

    const tbody = document.getElementById('lobbyTableBody');
    if (!data.lobbies || data.lobbies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><strong>Şu anda açık oyun bulunmuyor</strong>Oyundan "Çok oyunculu oyna → Oyun kur" diyerek ilk lobiyi açabilirsiniz.</td></tr>';
      return;
    }

    tbody.innerHTML = data.lobbies.map(item => {
      const initial = esc((item.hostNick || 'O').charAt(0).toUpperCase());
      const access = item.hasPass
        ? '<span class="status-lock">Şifreli Oda</span>'
        : '<span class="status-open">Herkese Açık</span>';
      return '<tr>' +
        '<td><div class="host-cell"><span class="avatar">' + initial + '</span><span>' + esc(item.hostNick) + '</span></div></td>' +
        '<td><span class="map-badge">' + esc(item.mapName) + '</span></td>' +
        '<td><span class="scen-text">' + esc(item.scenarioName) + '</span></td>' +
        '<td><span class="turn-badge">Tur ' + item.turn + '</span></td>' +
        '<td><span class="player-pill">👤 ' + item.players + ' Oyuncu</span></td>' +
        '<td>' + access + '</td>' +
      '</tr>';
    }).join('');
  } catch (err) {
    document.getElementById('pingLabel').textContent = 'Sunucu yanıtı bekleniyor...';
  }
}

fetchLobbyNow();
setInterval(() => {
  countdown--;
  if (countdown <= 0) {
    fetchLobbyNow();
  }
  document.getElementById('refreshCountdown').textContent = countdown + ' sn içinde yenilenir';
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

