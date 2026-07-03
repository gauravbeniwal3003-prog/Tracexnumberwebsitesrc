const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/\$\{service\}\?key=\$\{INTERNAL_MASTER_KEY\}&query=\$\{encodeURIComponent\(query\)\}`;/g,
  `let mappedService = service;
    if (service === 'adhr') mappedService = 'identity';
    else if (service === 'bnk') mappedService = 'bank';
    else if (service === 'phone') mappedService = 'lookup'; // Wait, lookup expects numquery=...

    let endpoint = \`\${renderBackendUrl.replace(/\\/$/, '')}/api/\${mappedService}?key=\${INTERNAL_MASTER_KEY}&query=\${encodeURIComponent(query)}\`;
    if (service === 'phone') {
        endpoint = \`\${renderBackendUrl.replace(/\\/$/, '')}/api/lookup?key=\${INTERNAL_MASTER_KEY}&numquery=\${encodeURIComponent(query)}\`;
    }
    `
);

fs.writeFileSync('server.ts', server);
console.log('Fixed service mapping.');
