const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const \{ error: deductError \} = \/\/ Credit deducted securely on backend/g, 'const deductError = null; // Credit deducted securely on backend');

fs.writeFileSync('src/App.tsx', code);
