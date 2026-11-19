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
      --purple: #a29bfe;
      --shadow-card: 0 8px 24px rgba(0, 0, 0, 0.42);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

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

    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-deep);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--gold-dim);
    }

    .wrap {
      max-width: 1180px;
      margin: 0 auto;
      padding: 12px 14px 28px 14px;
    }

    /* Üst Kurumsal Başlık */
    header.topbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: linear-gradient(180deg, rgba(19, 33, 60, 0.92), rgba(13, 22, 40, 0.96));
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 9px 14px;
      margin-bottom: 10px;
      box-shadow: var(--shadow-card);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .brand-emblem {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--gold), var(--gold-dim));
      color: #050810;
      font-weight: 900;
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(243, 210, 102, 0.25);
    }

    .brand-titles h1 {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.2px;
    }

    .brand-titles p {
      font-size: 10px;
      color: var(--muted);
    }

    .topbar-right {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--green-bg);
      border: 1px solid rgba(46, 204, 113, 0.35);
      color: #7bed9f;
      height: 23px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 6px var(--green);
    }

    /* Kompakt, Zarif & Küçültülmüş Tuş Sistemi */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 0 9px;
      height: 24px;
      font-size: 10.5px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg-soft);
      color: var(--text);
      cursor: pointer;
      transition: all 0.14s ease;
      white-space: nowrap;
      user-select: none;
    }

    .btn:hover {
      background: var(--bg-hover);
      border-color: var(--gold);
      color: var(--gold);
    }

    .btn:active {
      transform: scale(0.97);
    }

    .btn-gold {
      background: linear-gradient(135deg, var(--gold), var(--gold-dim));
      color: #050810;
      border: 1px solid rgba(255, 217, 94, 0.6);
      font-weight: 700;
    }

    .btn-gold:hover {
      background: linear-gradient(135deg, var(--gold-strong), var(--gold));
      color: #050810;
      border-color: var(--gold-strong);
    }

    .btn-sm {
      padding: 0 7px;
      height: 21px;
      font-size: 10px;
      border-radius: 5px;
    }

    .btn-xs {
      padding: 0 6px;
      height: 19px;
      font-size: 9.5px;
      border-radius: 4px;
    }

    .btn-danger {
      background: var(--red-bg);
      border-color: rgba(231, 76, 60, 0.42);
      color: #ff8e8e;
    }

    .btn-danger:hover {
      background: rgba(231, 76, 60, 0.28);
      border-color: var(--red);
      color: #ffffff;
    }

    .btn-ok {
      background: var(--green-bg);
      border-color: rgba(46, 204, 113, 0.42);
      color: #7bed9f;
    }

    .btn-ok:hover {
      background: rgba(46, 204, 113, 0.28);
      border-color: var(--green);
      color: #ffffff;
    }

    .btn-info {
      background: var(--blue-bg);
      border-color: rgba(52, 152, 219, 0.42);
      color: #74b9ff;
    }

    .btn-info:hover {
      background: rgba(52, 152, 219, 0.28);
      border-color: var(--blue);
      color: #ffffff;
    }
    /* Canlı Duyuru Şeridi */
    .notice-bar {
      background: linear-gradient(90deg, rgba(243, 210, 102, 0.13), rgba(19, 33, 60, 0.9));
      border: 1px solid var(--border-gold);
      border-radius: 9px;
      padding: 7px 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 11px;
      color: var(--gold);
    }

    .notice-left {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }

    .notice-badge {
      background: var(--gold);
      color: #050810;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .notice-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
    }

    /* Üst Özet İstatistik Kartları */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    @media (max-width: 760px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 8px 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .stat-label {
      font-size: 10px;
      color: var(--muted);
      font-weight: 600;
    }

    .stat-val {
      font-size: 15px;
      font-weight: 800;
      color: var(--gold);
    }

    /* Ana 2 Sütunlu Düzen */
    .grid-main {
      display: grid;
      grid-template-columns: 1.65fr 1fr;
      gap: 10px;
    }

    @media (max-width: 900px) {
      .grid-main {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 11px 12px;
      box-shadow: var(--shadow-card);
    }

    .card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(31, 51, 88, 0.7);
    }

    .card-head h2 {
      font-size: 12px;
      font-weight: 700;
      color: var(--gold);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    th, td {
      text-align: left;
      padding: 6px 7px;
      border-bottom: 1px solid rgba(31, 51, 88, 0.45);
      vertical-align: middle;
    }

    th {
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    tbody tr:hover {
      background: rgba(19, 33, 60, 0.45);
    }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 600;
      background: var(--blue-bg);
      color: var(--blue);
      border: 1px solid rgba(52, 152, 219, 0.35);
      white-space: nowrap;
    }

    .tag-gold {
      background: rgba(243, 210, 102, 0.14);
      color: var(--gold);
      border-color: rgba(243, 210, 102, 0.38);
    }

    .tag-green {
      background: var(--green-bg);
      color: #7bed9f;
      border-color: rgba(46, 204, 113, 0.38);
    }

    .tag-red {
      background: var(--red-bg);
      color: #ff8e8e;
      border-color: rgba(231, 76, 60, 0.4);
    }

    /* Canlı Lobi Sohbeti */
    .chat-box {
      height: 225px;
      overflow-y: auto;
      background: var(--bg-deep);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 7px 9px;
      margin-bottom: 7px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .chat-line {
      font-size: 11px;
      word-break: break-word;
      line-height: 1.38;
    }

    .chat-time {
      font-size: 9.5px;
      color: var(--muted);
      margin-right: 4px;
    }

    .chat-admin {
      color: var(--gold);
      font-weight: 700;
    }

    .chat-vip {
      color: #55efc4;
      font-weight: 600;
    }

    .row-input {
      display: flex;
      gap: 5px;
      align-items: center;
    }

    input[type="text"], input[type="password"], select {
      width: 100%;
      height: 24px;
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg-deep);
      color: var(--text);
      outline: none;
    }

    input:focus, select:focus {
      border-color: var(--gold);
    }

    /* Admin Tam Kontrol Paneli */
    .admin-section {
      margin-top: 12px;
      display: none;
    }

    .admin-section.active {
      display: block;
    }

    .admin-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-bottom: 10px;
    }

    @media (max-width: 760px) {
      .admin-grid {
        grid-template-columns: 1fr;
      }
    }

    .sub-box {
      background: rgba(8, 14, 26, 0.72);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px;
    }

    .sub-box-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--gold);
      margin-bottom: 6px;
    }

    .device-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
    }

    .empty-state {
      text-align: center;
      padding: 18px 10px;
      color: var(--muted);
      font-size: 11px;
    }

    /* Toast Bildirim & Modal */
    .toast {
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: var(--bg-card);
      border: 1px solid var(--gold);
      color: var(--gold);
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
      z-index: 9999;
      display: none;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 5, 12, 0.78);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      padding: 14px;
    }

    .modal-backdrop.open {
      display: flex;
    }

    .modal-card {
      width: 100%;
      max-width: 340px;
      background: var(--bg-card);
      border: 1px solid var(--gold);
      border-radius: 11px;
      padding: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.65);
    }

    .modal-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--gold);
      margin-bottom: 6px;
    }

    .modal-desc {
      font-size: 11px;
      color: var(--text-dim);
      margin-bottom: 9px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- Üst Kurumsal Menü -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-emblem">AoH2 DE</div>
        <div class="brand-titles">
          <h1>Turgut Edition — Multiplayer Portal</h1>
          <p>Canlı Sunucu Listesi, Lobi Sohbeti &amp; Merkezi Yönetim Sistemi</p>
        </div>
      </div>
      <div class="topbar-right">
        <span class="status-pill"><span class="status-dot"></span> Sunucu Aktif</span>
        <button class="btn btn-sm" onclick="refreshAll(true)">Yenile</button>
        <button class="btn btn-gold btn-sm" id="btnToggleAdmin" onclick="openAdminAuth()">Admin Girişi</button>
      </div>
    </header>

    <!-- Canlı Duyuru Şeridi -->
    <div class="notice-bar">
      <div class="notice-left">
        <span class="notice-badge">DUYURU</span>
        <span class="notice-text" id="globalAnnouncement">AoH2 Definitive Edition Turgut Multiplayer sunucusuna hoş geldiniz!</span>
      </div>
      <span class="tag tag-gold" id="lastSyncBadge">Senkronize</span>
    </div>

    <!-- Üst İstatistik Kartları -->
    <div class="stats-row">
      <div class="stat-card">
        <div>
          <div class="stat-label">AKTİF ODA</div>
          <div class="stat-val" id="statRooms">0</div>
        </div>
        <span class="tag">Lobi &amp; Oyun</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label">ÇEVRİMİÇİ OYUNCU</div>
          <div class="stat-val" id="statPlayers">0</div>
        </div>
        <span class="tag tag-green">Canlı</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label">AKTİF SENARYO</div>
          <div class="stat-val" id="statScenario" style="font-size:12px;">Modern World</div>
        </div>
        <span class="tag tag-gold">Otomatik</span>
      </div>
      <div class="stat-card">
        <div>
          <div class="stat-label">SUNUCU DURUMU</div>
          <div class="stat-val" id="statPing" style="font-size:13px;">Online</div>
        </div>
        <span class="tag tag-green">WebSocket</span>
      </div>
    </div>

    <!-- Ana İki Sütunlu Alan: Canlı Odalar & Lobi Sohbeti -->
    <div class="grid-main">
      <!-- Sol: Canlı Odalar Listesi -->
      <div class="card">
        <div class="card-head">
          <h2>Canlı Çok Oyunculu Odalar</h2>
          <div style="display:flex; gap:5px; align-items:center;">
            <input type="text" id="roomFilterInput" placeholder="Oda, kurucu veya senaryo ara..." style="width:165px;" oninput="renderRoomsTable()" />
            <button class="btn btn-xs" onclick="refreshAll(true)">Güncelle</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Oda Adı</th>
                <th>Kurucu (ID)</th>
                <th>Harita</th>
                <th>Senaryo</th>
                <th>Oyuncu</th>
                <th>Tur</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody id="roomsTableBody">
              <tr>
                <td colspan="7" class="empty-state">Canlı odalar yükleniyor...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Sağ: Canlı Lobi Sohbeti -->
      <div class="card">
        <div class="card-head">
          <h2>Canlı Lobi Sohbeti</h2>
          <span class="tag tag-gold">Oyun İçi Senkron</span>
        </div>
        <div class="chat-box" id="publicChatBox">
          <div class="empty-state">Sohbet geçmişi yükleniyor...</div>
        </div>
        <div class="row-input" style="margin-bottom:5px;">
          <input type="text" id="webNickInput" placeholder="Web Takma Adınız" style="max-width:125px;" maxlength="20" />
          <input type="text" id="webChatInput" placeholder="Lobiye mesaj yazın..." maxlength="160" onkeydown="if(event.key==='Enter') sendPublicChat()" />
          <button class="btn btn-gold btn-sm" onclick="sendPublicChat()">Gönder</button>
        </div>
        <div style="font-size:10px; color:var(--muted);">
          Buradan yazdığınız mesajlar oyun içindeki <b>Lobby Chat</b> ekranında anında görünür.
        </div>
      </div>
    </div>
    <!-- Admin Tam Kontrol Merkezi (Yetkili Girişi Sonrası Açılır) -->
    <section class="admin-section" id="adminSection">
      <div class="card" style="border-color: var(--border-gold);">
        <div class="card-head">
          <h2>Admin Tam Kontrol Merkezi — Turgut Efe</h2>
          <div style="display:flex; gap:5px; align-items:center;">
            <span class="tag tag-gold" id="adminDeviceCount">0 Cihaz Kayıtlı</span>
            <button class="btn btn-xs btn-info" onclick="refreshAdminState(true)">Verileri Çek</button>
            <button class="btn btn-xs btn-danger" onclick="adminClearChat()">Sohbeti Temizle</button>
            <button class="btn btn-xs" onclick="logoutAdmin()">Çıkış</button>
          </div>
        </div>

        <!-- Üst Hızlı Komut Kutuları -->
        <div class="admin-grid">
          <!-- Sol Kutu: Oyun İçi Canlı Duyuru Yayınla -->
          <div class="sub-box">
            <div class="sub-box-title">1. Oyun İçi Genel Duyuru Yayınla (MP Info)</div>
            <div class="row-input">
              <input type="text" id="adminAnnounceInput" placeholder="Tüm oyuncuların MP Info kutusunda görünecek mesaj..." maxlength="220" />
              <button class="btn btn-gold btn-sm" onclick="sendAdminAnnounce()">Yayınla</button>
            </div>
            <div style="font-size:10px; color:var(--muted); margin-top:4px;">
              Gönderdiğiniz duyuru oyuncuların oyun içindeki <b>MP Info [NEW]</b> penceresine anında düşer.
            </div>
          </div>

          <!-- Sağ Kutu: Hedef Cihaz ID'ye Özel İşlem -->
          <div class="sub-box">
            <div class="sub-box-title">2. Hedef Cihaz ID'ye Özel Komut Gönder</div>
            <div class="row-input" style="margin-bottom:5px;">
              <input type="text" id="targetDeviceIdInput" placeholder="Cihaz ID (örn: AOH-9AA2D0)" style="max-width:155px; text-transform:uppercase;" maxlength="24" />
              <input type="text" id="targetMessageInput" placeholder="Oyuncuya görünecek özel mesaj veya sebep..." maxlength="200" />
            </div>
            <div class="device-actions">
              <button class="btn btn-xs btn-gold" onclick="runTargetedCommand('WARN')">Özel Uyarı Gönder</button>
              <button class="btn btn-xs btn-info" onclick="runTargetedCommand('KICK')">Odadan At (Kick)</button>
              <button class="btn btn-xs btn-danger" onclick="runTargetedCommand('BAN')">Kalıcı Banla</button>
              <button class="btn btn-xs btn-ok" onclick="runTargetedCommand('UNBAN')">Ban Kaldır</button>
              <button class="btn btn-xs" onclick="runTargetedCommand('VIP')">VIP Ver / Al</button>
            </div>
          </div>
        </div>

        <!-- Alt Tablo: Canlı Bağlı Cihazlar & Anlık Müdahale -->
        <div class="sub-box">
          <div class="sub-box-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>3. Canlı Cihaz &amp; Oyuncu Takip Listesi (Tek Tıkla Kontrol)</span>
            <input type="text" id="deviceSearchInput" placeholder="ID veya Takma Ad filtrele..." style="width:170px;" oninput="renderDevicesTable()" />
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Cihaz ID</th>
                  <th>Hesap İsmi</th>
                  <th>Ekran</th>
                  <th>Aktif Senaryo</th>
                  <th>Yetki</th>
                  <th>Hızlı İşlemler</th>
                </tr>
              </thead>
              <tbody id="adminDevicesBody">
                <tr>
                  <td colspan="7" class="empty-state">Cihaz listesi yükleniyor...</td>
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
      <div class="modal-title">Admin Tam Kontrol Girişi</div>
      <div class="modal-desc">
        Canlı cihaz kontrolü, özel uyarı gönderme, banlama ve oyun içi duyuru yönetimi için yönetici şifresini girin.
      </div>
      <input type="password" id="adminPassInput" placeholder="Yönetici Şifresi" onkeydown="if(event.key==='Enter') confirmAdminLogin()" />
      <div class="modal-footer">
        <button class="btn btn-sm" onclick="closeAdminModal()">İptal</button>
        <button class="btn btn-gold btn-sm" onclick="confirmAdminLogin()">Giriş Yap</button>
      </div>
    </div>
  </div>
    <script>
    var cachedRooms = [];
    var cachedDevices = [];
    var adminPass = sessionStorage.getItem("turgut_admin_pass") || "";
    var toastTimer = null;

    var WEB_SCENARIO_MAP = {
      "0": "Modern World",
      "1": "1440",
      "2": "World War II",
      "3": "1200",
      "4": "Victorian Era",
      "5": "5",
      "6": "1440 - Alternate",
      "7": "World War I"
    };

    function escHtml(str) {
      var s = String(str == null ? "" : str);
      return s
        .split("&").join("&amp;")
        .split("<").join("&lt;")
        .split(">").join("&gt;")
        .split('"').join("&quot;")
        .split("'").join("&#39;");
    }

    function showToast(msg) {
      var box = document.getElementById("toastBox");
      if (!box) return;
      box.textContent = msg;
      box.style.display = "block";
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        box.style.display = "none";
      }, 3200);
    }

    function formatScenarioLabel(rawScenario, hostDeviceId, hostNick) {
      var clean = String(rawScenario == null ? "" : rawScenario).trim();
      if (clean && clean !== "0" && clean !== "-" && clean !== "null" && clean !== "undefined") {
        return WEB_SCENARIO_MAP[clean] || clean;
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
              return WEB_SCENARIO_MAP[devScen] || devScen;
            }
          }
        }
      }

      return clean === "0" ? "Modern World" : "Custom Scenario";
    }

    function renderRoomsTable() {
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

      document.getElementById("statRooms").textContent = String(cachedRooms.length);

      var totalPlayers = 0;
      var latestScen = "Modern World";
      for (var i = 0; cachedRooms.length > i; i++) {
        var item = cachedRooms[i];
        totalPlayers += Math.max(1, Number(item.players) || 1);
        latestScen = formatScenarioLabel(item.scenario, item.hostDeviceId, item.host);
      }
      document.getElementById("statPlayers").textContent = String(totalPlayers);
      document.getElementById("statScenario").textContent = latestScen;

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Şu anda aktif çok oyunculu oda bulunmuyor.</td></tr>';
        return;
      }

      var html = "";
      for (var j = 0; filtered.length > j; j++) {
        var r = filtered[j];
        var scenarioDisplay = formatScenarioLabel(r.scenario, r.hostDeviceId, r.host);
        var lockIcon = r.hasPassword ? ' <span class="tag tag-gold">Şifreli</span>' : "";
        var statusTag = r.inGame
          ? '<span class="tag tag-gold">Oyunda</span>'
          : '<span class="tag tag-green">Lobide</span>';
        var hostIdTag = (r.hostDeviceId && r.hostDeviceId !== "-")
          ? ' <span style="color:var(--muted); font-size:10px;">(' + escHtml(r.hostDeviceId) + ')</span>'
          : "";

        html += "<tr>" +
          "<td><strong>" + escHtml(r.name || "Oda") + "</strong>" + lockIcon + "</td>" +
          "<td>" + escHtml(r.host || "Kurucu") + hostIdTag + "</td>" +
          "<td>" + escHtml(r.map || "Earth") + "</td>" +
          "<td><span class='tag'>" + escHtml(scenarioDisplay) + "</span></td>" +
          "<td><strong>" + escHtml(r.players || 1) + "</strong> / " + escHtml(r.maxPlayers || 8) + "</td>" +
          "<td>Tur " + escHtml(r.turn || 1) + "</td>" +
          "<td>" + statusTag + "</td>" +
        "</tr>";
      }
      tbody.innerHTML = html;
    }
    function renderPublicChat(chatList) {
      var box = document.getElementById("publicChatBox");
      if (!box) return;

      if (!Array.isArray(chatList) || chatList.length === 0) {
        box.innerHTML = '<div class="empty-state">Henüz sohbet mesajı bulunmuyor. İlk mesajı siz yazın!</div>';
        return;
      }

      var wasAtBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) <= 45;
      var html = "";

      for (var i = 0; chatList.length > i; i++) {
        var m = chatList[i];
        if (!m) continue;
        var timeStr = m.ts
          ? new Date(m.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
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
          '<span class="' + nameClass + '">' + escHtml(m.nick || "Oyuncu") + ':</span> ' +
          '<span>' + escHtml(m.text || "") + '</span>' +
        '</div>';
      }

      box.innerHTML = html;
      if (wasAtBottom) {
        box.scrollTop = box.scrollHeight;
      }
    }

    async function sendPublicChat() {
      var nickEl = document.getElementById("webNickInput");
      var textEl = document.getElementById("webChatInput");
      if (!textEl) return;

      var text = textEl.value.trim();
      if (!text) return;

      var nick = (nickEl && nickEl.value.trim()) ? nickEl.value.trim() : "WebOyuncu";
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
          renderPublicChat(data.chat);
        } else {
          showToast("Mesaj gönderilemedi.");
        }
      } catch (e) {
        showToast("Sunucu bağlantı hatası.");
      }
    }

    async function refreshAll(manual) {
      var t0 = performance.now();
      try {
        var responses = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/chat")
        ]);
        var roomsRes = responses[0];
        var chatRes = responses[1];
        var roomsData = await roomsRes.json();
        var chatData = await chatRes.json();

        var ms = Math.max(1, Math.round(performance.now() - t0));
        var pingEl = document.getElementById("statPing");
        if (pingEl) pingEl.textContent = ms + " ms";

        var syncBadge = document.getElementById("lastSyncBadge");
        if (syncBadge) {
          syncBadge.textContent = "Güncel (" + new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + ")";
        }

        if (roomsData && roomsData.ok) {
          cachedRooms = Array.isArray(roomsData.rooms) ? roomsData.rooms : [];
          if (roomsData.announcement) {
            var annEl = document.getElementById("globalAnnouncement");
            if (annEl) annEl.textContent = roomsData.announcement;
          }
          renderRoomsTable();
        }

        if (chatData && chatData.ok && Array.isArray(chatData.chat)) {
          renderPublicChat(chatData.chat);
        }

        if (manual) {
          showToast("Canlı sunucu verileri güncellendi.");
        }
      } catch (e) {
        var pingEl2 = document.getElementById("statPing");
        if (pingEl2) pingEl2.textContent = "Bağlanıyor...";
      }
    }

    function openAdminAuth() {
      if (adminPass) {
        var sec = document.getElementById("adminSection");
        if (sec) sec.classList.toggle("active");
        refreshAdminState(false);
        return;
      }
      var modal = document.getElementById("adminModal");
      if (modal) modal.classList.add("open");
      var inp = document.getElementById("adminPassInput");
      if (inp) {
        inp.value = "";
        setTimeout(function () { inp.focus(); }, 60);
      }
    }

    function closeAdminModal() {
      var modal = document.getElementById("adminModal");
      if (modal) modal.classList.remove("open");
    }

    async function confirmAdminLogin() {
      var inp = document.getElementById("adminPassInput");
      var pass = inp ? inp.value.trim() : "";
      if (!pass) {
        showToast("Lütfen yönetici şifresini girin.");
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
          showToast("Hatalı yönetici şifresi!");
          return;
        }

        adminPass = pass;
        sessionStorage.setItem("turgut_admin_pass", pass);
        closeAdminModal();

        var sec = document.getElementById("adminSection");
        if (sec) sec.classList.add("active");

        var btn = document.getElementById("btnToggleAdmin");
        if (btn) btn.textContent = "Admin Paneli";

        cachedDevices = Array.isArray(data.devices) ? data.devices : [];
        renderDevicesTable();
        renderRoomsTable();
        showToast("Admin Tam Kontrol Merkezi aktif edildi.");
      } catch (e) {
        showToast("Sunucuya bağlanılamadı.");
      }
    }

    function logoutAdmin() {
      adminPass = "";
      sessionStorage.removeItem("turgut_admin_pass");
      var sec = document.getElementById("adminSection");
      if (sec) sec.classList.remove("active");
      var btn = document.getElementById("btnToggleAdmin");
      if (btn) btn.textContent = "Admin Girişi";
      showToast("Admin oturumu kapatıldı.");
    }
    function selectDeviceForAction(deviceId) {
      var inp = document.getElementById("targetDeviceIdInput");
      if (inp) {
        inp.value = deviceId;
        inp.focus();
      }
      showToast("Hedef cihaz seçildi: " + deviceId);
    }

    function renderDevicesTable() {
      var tbody = document.getElementById("adminDevicesBody");
      var countBadge = document.getElementById("adminDeviceCount");
      var searchEl = document.getElementById("deviceSearchInput");
      if (!tbody) return;

      if (countBadge) {
        countBadge.textContent = cachedDevices.length + " Cihaz Kayıtlı";
      }

      var q = searchEl ? searchEl.value.trim().toLowerCase() : "";
      var filtered = cachedDevices.filter(function (d) {
        if (!q) return true;
        return String(d.deviceId || "").toLowerCase().indexOf(q) !== -1 ||
          String(d.nick || "").toLowerCase().indexOf(q) !== -1 ||
          String(d.scenario || "").toLowerCase().indexOf(q) !== -1;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Kayıtlı veya filtreye uyan cihaz bulunamadı.</td></tr>';
        return;
      }

      var html = "";
      for (var i = 0; filtered.length > i; i++) {
        var d = filtered[i];
        var statusHtml = d.online
          ? '<span class="tag tag-green">Çevrimiçi</span>'
          : '<span class="tag">Çevrimdışı</span>';

        var roleHtml = '<span class="tag">Standart</span>';
        if (d.isBanned) {
          roleHtml = '<span class="tag tag-red">BANLI</span>';
        } else if (d.isVip) {
          roleHtml = '<span class="tag tag-gold">VIP</span>';
        }

        var scenDisplay = formatScenarioLabel(d.scenario, d.deviceId, d.nick);
        var safeId = escHtml(d.deviceId || "");

        var banBtnHtml = d.isBanned
          ? '<button class="btn btn-xs btn-ok" data-act="UNBAN" data-id="' + safeId + '" onclick="handleRowBtn(this)">Ban Kaldır</button>'
          : '<button class="btn btn-xs btn-danger" data-act="BAN" data-id="' + safeId + '" onclick="handleRowBtn(this)">Banla</button>';

        html += "<tr>" +
          "<td>" + statusHtml + "</td>" +
          "<td><strong style='color:var(--gold); cursor:pointer;' data-id='" + safeId + "' onclick='selectDeviceForAction(this.getAttribute(\"data-id\"))'>" + safeId + "</strong></td>" +
          "<td>" + escHtml(d.nick || "Player") + "</td>" +
          "<td><span class='tag'>" + escHtml(d.screen || "MAIN_MENU") + "</span></td>" +
          "<td>" + escHtml(scenDisplay) + "</td>" +
          "<td>" + roleHtml + "</td>" +
          "<td><div class='device-actions'>" +
            '<button class="btn btn-xs btn-gold" data-act="WARN" data-id="' + safeId + '" onclick="handleRowBtn(this)">Uyarı</button>' +
            '<button class="btn btn-xs btn-info" data-act="KICK" data-id="' + safeId + '" onclick="handleRowBtn(this)">At</button>' +
            banBtnHtml +
            '<button class="btn btn-xs" data-act="VIP" data-id="' + safeId + '" onclick="handleRowBtn(this)">VIP</button>' +
          "</div></td>" +
        "</tr>";
      }
      tbody.innerHTML = html;
    }

    function handleRowBtn(btn) {
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var devId = btn.getAttribute("data-id");
      if (act && devId) {
        quickDeviceAction(act, devId);
      }
    }

    async function postAdminAction(payload) {
      if (!adminPass) {
        showToast("Önce Admin girişi yapmalısınız.");
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
          await refreshAdminState(false);
          await refreshAll(false);
          return true;
        }
        showToast("İşlem başarısız oldu.");
        return false;
      } catch (e) {
        showToast("Sunucu iletişim hatası.");
        return false;
      }
    }

    async function sendAdminAnnounce() {
      var inp = document.getElementById("adminAnnounceInput");
      var message = inp ? inp.value.trim() : "";
      if (!message) {
        showToast("Lütfen yayınlanacak duyuru metnini yazın.");
        return;
      }
      var ok = await postAdminAction({ action: "ANNOUNCE", message: message });
      if (ok) {
        inp.value = "";
        showToast("Canlı duyuru tüm oyunculara yayınlandı!");
      }
    }

    async function runTargetedCommand(action) {
      var idInp = document.getElementById("targetDeviceIdInput");
      var msgInp = document.getElementById("targetMessageInput");
      var deviceId = idInp ? idInp.value.trim().toUpperCase() : "";
      var message = msgInp ? msgInp.value.trim() : "";

      if (!deviceId) {
        showToast("Lütfen hedef Cihaz ID girin veya listeden seçin.");
        return;
      }
      var ok = await postAdminAction({ action: action, deviceId: deviceId, message: message });
      if (ok) {
        if (msgInp) msgInp.value = "";
        showToast(deviceId + " için " + action + " komutu uygulandı.");
      }
    }

    async function quickDeviceAction(action, deviceId) {
      var message = "";
      if (action === "WARN") {
        var custom = prompt(deviceId + " cihazına gönderilecek özel uyarı mesajını yazın:", "Turgut Efe tarafından resmi uyarı aldınız.");
        if (custom === null) return;
        message = custom.trim();
      } else if (action === "BAN") {
        var confirmBan = confirm(deviceId + " cihazını kalıcı olarak banlamak istediğinize emin misiniz?");
        if (!confirmBan) return;
        message = "Cihazınız (" + deviceId + ") yönetici Turgut Efe tarafından yasaklandı.";
      }

      var ok = await postAdminAction({ action: action, deviceId: deviceId, message: message });
      if (ok) {
        showToast(deviceId + " -> " + action + " tamamlandı.");
      }
    }

    async function adminClearChat() {
      if (!confirm("Tüm lobi sohbet geçmişini temizlemek istiyor musunuz?")) return;
      var ok = await postAdminAction({ action: "CLEAR_CHAT" });
      if (ok) {
        showToast("Lobi sohbet geçmişi temizlendi.");
      }
    }

    async function refreshAdminState(manual) {
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
          renderDevicesTable();
          renderRoomsTable();
          if (manual) showToast("Admin verileri güncellendi.");
        }
      } catch (e) {}
    }

    (function initPortal() {
      var savedNick = localStorage.getItem("turgut_web_nick");
      var nickInp = document.getElementById("webNickInput");
      if (savedNick && nickInp) {
        nickInp.value = savedNick;
      }

      if (adminPass) {
        var sec = document.getElementById("adminSection");
        if (sec) sec.classList.add("active");
        var btn = document.getElementById("btnToggleAdmin");
        if (btn) btn.textContent = "Admin Paneli";
        refreshAdminState(false);
      }

      refreshAll(false);
      setInterval(function () { refreshAll(false); }, 3500);
      setInterval(function () {
        if (adminPass) refreshAdminState(false);
      }, 4500);
    })();
  </script>
</body>
</html>`;
};
