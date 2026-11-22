const https = require("https");
const http = require("http");

const DEFAULT_SELF_URL = "https://aoh2-de-mp-server.onrender.com/health";
const PING_INTERVAL_MS = 4 * 60 * 1000;

function pingUrl(targetUrl) {
  try {
    const client = targetUrl.startsWith("https") ? https : http;
    const req = client.get(targetUrl, { timeout: 10000 }, (res) => res.resume());
    req.on("error", () => {});
    req.on("timeout", () => {
      try { req.destroy(); } catch (_) {}
    });
  } catch (_) {}
}

function startKeepAlive(customUrl) {
  const target = (customUrl || process.env.RENDER_EXTERNAL_URL || DEFAULT_SELF_URL).trim();
  const healthUrl = target.endsWith("/health") ? target : target.replace(/\/+$/, "") + "/health";
  const t1 = setTimeout(() => pingUrl(healthUrl), 15000);
  const t2 = setInterval(() => pingUrl(healthUrl), PING_INTERVAL_MS);
  if (t1.unref) t1.unref();
  if (t2.unref) t2.unref();
  console.log("[KeepAlive] Active for:", healthUrl);
}

module.exports = { startKeepAlive };
