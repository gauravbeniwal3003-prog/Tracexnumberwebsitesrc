const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import \{ fileURLToPath \} from "url";/g, "");
code = code.replace(/const __filename = fileURLToPath\(import\.meta\.url\);/g, "const __filename = __filename;");

fs.writeFileSync('server.ts', code);
