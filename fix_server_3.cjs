const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/setupVite\(\)\.then\(\(\) => \{\n  app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n    console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n  \}\);\n\}\)/g, 
`setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
});`);

code = code.replace(/setupVite\(\)\.then\(\(\) => \{\n  app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n    console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n  \}\);\n\}/g, 
`setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
});`);

// It seems there's a missing closing brace for the `setupVite` function.
// Let's replace the whole bottom section to be sure.
code = code.replace(/async function setupVite\(\) \{[\s\S]*$/, `async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.get("/sitemap.xml", (req, res) => {
      res.header("Content-Type", "application/xml");
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "sitemap.xml"));
    });
    app.get("/robots.txt", (req, res) => {
      res.header("Content-Type", "text/plain");
      res.sendFile(path.join(distPath, "robots.txt"));
    });
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
});`);


fs.writeFileSync('server.ts', code);
