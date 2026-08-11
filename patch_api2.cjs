const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

const target = `const cleanTelegram = telegramId.trim().replace(/^@/, '');`;
const replacement = `const cleanTelegram = telegramId.trim();`;

code = code.replace(target, replacement);
fs.writeFileSync('src/services/api.ts', code);
