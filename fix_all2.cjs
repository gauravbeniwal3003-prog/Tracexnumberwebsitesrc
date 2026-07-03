const fs = require('fs');

let api = fs.readFileSync('src/services/api.ts', 'utf8');
api = api.replace(/renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)/g, "''");
api = api.replace(/\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}/g, "");
api = api.replace(/renderBackendUrl/g, "''");
fs.writeFileSync('src/services/api.ts', api);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/if \(service === 'telegram'\) \{\n      creditCost = 8;\n    \} else if \(service === 'adhr'\) \{/g, `if (service === 'adhr') {`);
app = app.replace(/    if \(service === 'telegram'\) \{\n      creditCost = 8;\n    \} else if \(service === 'adhr'\) \{/g, `    if (service === 'adhr') {`);
fs.writeFileSync('src/App.tsx', app);
