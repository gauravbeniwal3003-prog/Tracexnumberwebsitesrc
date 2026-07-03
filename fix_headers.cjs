const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(/res\.setHeader\('Access-Control-Allow-Origin', '\*'\);/g, "// Removed wildcard CORS");
server = server.replace(/app\.use\(helmet\(\{/g, "app.disable('x-powered-by');\napp.use(helmet({");

fs.writeFileSync('server.ts', server);
console.log('Fixed headers.');
