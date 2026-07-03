const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');
code = code.replace(/console\.log\('Skipping insecure client-side cache'\); \/\/ \(\{[\s\S]*?\}, \{ onConflict: 'telegram_id' \}\);/g, "console.log('Skipping insecure client-side cache');");
code = code.replace(/console\.log\('Skipping insecure client-side cache'\); \/\/ \(\{[\s\S]*?\}\);/g, "console.log('Skipping insecure client-side cache');");
fs.writeFileSync('src/services/api.ts', code);
