import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Number Lookup Proxying
  app.get("/api/lookup", async (req, res) => {
    try {
      const { number } = req.query;
      if (!number || typeof number !== "string") {
        return res.status(400).json({ 
          success: false, 
          error: "Mobile number is required." 
        });
      }

      // Clean non-digits
      const cleanNumber = number.replace(/\D/g, "");
      if (cleanNumber.length !== 10) {
        return res.status(400).json({ 
          success: false, 
          error: "Please enter a valid 10-digit mobile number." 
        });
      }

      const apiKey = process.env.LOOKUP_API_KEY || "TX-5094CTNZ6";
      const apiUrl = `https://tracexdata-api.onrender.com/api/lookup?key=${apiKey}&number=${cleanNumber}`;

      console.log(`[Proxy] Performing lookup for: ${cleanNumber}`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        let errText = await response.text();
        errText = errText.replace(/tracexdata-api\.onrender\.com/gi, "TraceXnumber.web.app");
        console.error(`[Proxy Error] Upstream status ${response.status}: ${errText}`);
        return res.status(response.status).json({
          success: false,
          error: "The search service responded with an error or is busy. Please try again.",
          details: errText
        });
      }

      let dataText = await response.text();
      dataText = dataText.replace(/tracexdata-api\.onrender\.com/gi, "TraceXnumber.web.app");
      
      let data;
      try {
        data = JSON.parse(dataText);
      } catch (e) {
        data = { raw: dataText };
      }

      return res.json({
        success: true,
        data: data
      });

    } catch (err: any) {
      console.error("[Proxy Fatal Error]", err);
      return res.status(500).json({
        success: false,
        error: "Failed to connect to the lookup service. Please verify your connection."
      });
    }
  });

  // Isolated Route for Adsterra Native Banner
  app.get("/ad-native", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            background-color: transparent;
          }
          #container-8f92778896f94ab8098c667399156c1f {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div id="container-8f92778896f94ab8098c667399156c1f"></div>
        <script async="async" data-cfasync="false" src="https://pl30126054.effectivecpmnetwork.com/8f92778896f94ab8098c667399156c1f/invoke.js"></script>
      </body>
      </html>
    `);
  });

  // Integration with Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Free Number Lookup running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server Error during start]", err);
});
