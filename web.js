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
