const RENDER_BACKEND_URL = "https://tracexdata-api.onrender.com";

export default async function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || "/";
    const targetUrl = `${RENDER_BACKEND_URL}${rawUrl.startsWith("/api") ? rawUrl : `/api${rawUrl}`}`;

    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(req.headers || {})) {
      if (key !== "host" && key !== "content-length" && typeof val === "string") {
        headers[key] = val;
      }
    }

    const options: RequestInit = {
      method: req.method || "GET",
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      options.body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
      if (!headers["content-type"]) {
        headers["content-type"] = "application/json";
      }
    }

    const response = await fetch(targetUrl, options);
    res.status(response.status);

    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(lower)) {
        res.setHeader(name, value);
      }
    });

    const bodyText = await response.text();
    return res.send(bodyText);
  } catch (error: any) {
    return res.status(502).json({
      status: "error",
      message: "Gateway failed to connect to TraceX Render backend",
      details: error?.message || String(error),
    });
  }
}
