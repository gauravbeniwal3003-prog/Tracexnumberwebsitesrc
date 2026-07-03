const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/setupVite\(\)\.then\(\(\) => \{\n  app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n    console\.log\(\`Server running on http:\/\/localhost:\$\{PORT\}\`\);\n  \}\);\n\}/,
`setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
});`);

fs.writeFileSync('server.ts', code);
