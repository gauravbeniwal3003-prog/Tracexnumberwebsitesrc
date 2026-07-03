const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/res\.status\(\d+\)\.json\(\{ error: err(?:or)?\.message \}\)/g, 'res.status(500).json({ error: "Internal Server Error" })');
code = code.replace(/res\.status\(\d+\)\.json\(\{ error: claimsErr\.message \}\)/g, 'res.status(500).json({ error: "Internal Server Error" })');

fs.writeFileSync('server.ts', code);
console.log('Patched error handling');
