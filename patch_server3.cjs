const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `const targetQuery = cleanedQuery.replace(/^@/, '');`;
const replacement = `const targetQuery = cleanedQuery;`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
