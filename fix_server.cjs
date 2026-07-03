const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Vite middleware for development\nif \(process\.env\.NODE_ENV !== "production"\) \{\n  const vite = await createViteServer\(\{\n    server: \{ middlewareMode: true \},\n    appType: "spa",\n  \}\);\n  app\.use\(vite\.middlewares\);\n\} else \{/g;
code = code.replace(regex, `// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {`);

code = code.replace(/app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n  console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n\}\);/,
  `app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}`);

code = code.replace(/import \{ fileURLToPath \} from 'url';\nimport \{ dirname \} from 'path';\nconst __filename = fileURLToPath\(import\.meta\.url\);\nconst __dirname = dirname\(__filename\);/g, "");
code = code.replace(/const __filename = fileURLToPath\(import\.meta\.url\);\nconst __dirname = dirname\(__filename\);/g, "");

// Wrap everything
code = code.replace(/app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{/g, `
setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
`);

code = code.replace(/  console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n\}\);/, `  console.log(\`Server running on http://localhost:\${PORT}\`);
  });
});`);

fs.writeFileSync('server.ts', code);
