// Vercel Serverless Function: /api/getAgent
// Proxies to Convex /getAgent so the widget can work with only data-bot-id.
// Requires environment variable: CONVEX_URL (e.g., https://your-app.convex.cloud)

module.exports = async (req, res) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) {
      Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.status(500).json({ error: "Server misconfigured: CONVEX_URL is not set" });
      return;
    }

    const target = `${convexUrl.replace(/\/$/, "")}/getAgent?botId=${encodeURIComponent(botId)}`;
    const resp = await fetch(target, { method: "GET", headers: { "Content-Type": "application/json" } });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(resp.status).send(typeof data === "string" ? data : JSON.stringify(data));
  } catch (e) {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(500).json({ error: e && e.message ? e.message : "Unknown error" });
  }
};
