const https = require('https');
const http = require('http');

const DEFAULT_SELF_URL = 'https://aoh2-de-mp-server.onrender.com/health';
const PING_INTERVAL_MS = 4 * 60 * 1000;

function pingUrl(targetUrl) {
  try {
    const client = targetUrl.startsWith('https') ? https : http;
    const req = client.get(targetUrl, { timeout: 10000 }, (res) => res.resume());
    req.on('error', () => {});
    req.on('timeout', () => { try { req.destroy(); } catch (_) {} });
  } catch (_) {}
}

function startKeepAlive(customUrl) {
  const target = (customUrl || process.env.RENDER_EXTERNAL_URL || DEFAULT_SELF_URL).trim();
  const healthUrl = target.endsWith('/health') ? target : target.replace(/\/+$/, '') + '/health';
  setTimeout(() => pingUrl(healthUrl), 15000);
  setInterval(() => pingUrl(healthUrl), PING_INTERVAL_MS);
  console.log('[KeepAlive] 7/24 active for:', healthUrl);
}

module.exports = { startKeepAlive };
