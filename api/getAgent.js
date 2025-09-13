// Vercel Serverless Function: /api/getAgent
// Proxies to Convex /getAgent so the widget can work with only data-bot-id.
// Requires environment variable: CONVEX_URL (e.g., https://your-app.convex.cloud)

module.exports = async (req, res) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };

  if (req.method === "OPTIONS") {
    res.status(204);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.end();
  }

  if (req.method !== "GET") {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const botId = (req.query && req.query.botId) || new URL(req.url, `http://${req.headers.host}`).searchParams.get("botId");
    if (!botId) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.status(400).json({ error: "Missing botId" });
      return;
    }

    const convexHttp = process.env.CONVEX_HTTP_URL;
    const convexUrl = convexHttp || process.env.CONVEX_URL;
    if (!convexUrl) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.status(500).json({ error: "Server misconfigured: CONVEX_URL/CONVEX_HTTP_URL is not set" });
      return;
    }

    const base = convexUrl.replace(/\/$/, "");
    const tryUrls = [
      `${base}/getAgent?botId=${encodeURIComponent(botId)}`,
      `${base}/api/getAgent?botId=${encodeURIComponent(botId)}`
    ];

    let resp;
    let lastText = "";
    for (const url of tryUrls) {
      resp = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
      lastText = await resp.text();
      if (resp.ok) break;
    }

    let data;
    try {
      data = JSON.parse(lastText);
    } catch {
      data = lastText;
    }

    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(resp.status).json(typeof data === "string" ? { error: data } : data);
  } catch (e) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(500).json({ error: e && e.message ? e.message : "Unknown error" });
  }
};
