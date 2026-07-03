const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /if \(\!service \|\| typeof service \!\=\= 'string' \|\| \!query \|\| typeof query \!\=\= 'string'\) \{/g,
  `const allowedServices = ['phone', 'telegram', 'adhr', 'bnk', 'vehicle', 'pancard', 'aadhaar_to_pan'];
  if (!service || typeof service !== 'string' || !allowedServices.includes(service) || !query || typeof query !== 'string') {`
);

fs.writeFileSync('server.ts', server);
console.log('Fixed SSRF.');
