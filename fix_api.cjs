const fs = require('fs');
let api = fs.readFileSync('src/services/api.ts', 'utf8');
api = api.replace(/const useDirectFallback = attempt > 2 \|\| !'';/g, "const useDirectFallback = true;");
fs.writeFileSync('src/services/api.ts', api);

let app = fs.readFileSync('src/App.tsx', 'utf8');
// The regex to fix the telegram issue in App.tsx
app = app.replace(/    \} else if \(service === 'telegram'\) \{\n    \} else if \(service === 'telegram'\) \{/g, `    } else if (service === 'telegram') {`);
fs.writeFileSync('src/App.tsx', app);
