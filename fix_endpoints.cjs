const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

code = code.replace(/const backendEndpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/lookup\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{number\}`;/g, 
  "const backendEndpoint = `/api/user-lookup?service=phone&query=${number}`;");

code = code.replace(/const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/telegram\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{telegramId\}`;/g, 
  "const endpoint = `/api/user-lookup?service=telegram&query=${telegramId}`;");

code = code.replace(/const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/identity\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{encodeURIComponent\(aadharNo\)\}`;/g, 
  "const endpoint = `/api/user-lookup?service=identity&query=${encodeURIComponent(aadharNo)}`;");

code = code.replace(/const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/bank\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{encodeURIComponent\(ifsc\)\}`;/g, 
  "const endpoint = `/api/user-lookup?service=bank&query=${encodeURIComponent(ifsc)}`;");

code = code.replace(/const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/vehicle\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{cleanVehicleNo\}`;/g, 
  "const endpoint = `/api/user-lookup?service=vehicle&query=${cleanVehicleNo}`;");

code = code.replace(/const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/pancard\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{cleanPancardNo\}`;/g, 
  "const endpoint = `/api/user-lookup?service=pancard&query=${cleanPancardNo}`;");

fs.writeFileSync('src/services/api.ts', code);
