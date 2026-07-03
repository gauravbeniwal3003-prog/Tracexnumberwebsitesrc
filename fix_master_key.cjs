const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /const SUPABASE_URL/g, 
  `const INTERNAL_MASTER_KEY = process.env.INTERNAL_MASTER_KEY || crypto.randomBytes(32).toString('hex');\nconst SUPABASE_URL`
);

server = server.replace(/\$\{process\.env\.INTERNAL_MASTER_KEY \|\| 'TX-SYSTEM-INTERNAL-ADMIN'\}/g, "${INTERNAL_MASTER_KEY}");
server = server.replace(/\(process\.env\.INTERNAL_MASTER_KEY \|\| 'TX-SYSTEM-INTERNAL-ADMIN'\)/g, "INTERNAL_MASTER_KEY");

fs.writeFileSync('server.ts', server);
console.log('Fixed master key fallback.');
