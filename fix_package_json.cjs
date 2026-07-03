const fs = require('fs');
let code = fs.readFileSync('package.json', 'utf8');

code = code.replace(/"build": "vite build",/g, '"build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",');

fs.writeFileSync('package.json', code);
