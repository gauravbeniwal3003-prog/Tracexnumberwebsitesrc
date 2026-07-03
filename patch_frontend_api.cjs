const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

// Replace all occurrences of renderBackendUrl with local /api/user-lookup
const endpointsToFix = [
  { match: /const backendEndpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/lookup\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{number\}`;/, repl: "const backendEndpoint = `/api/user-lookup?service=lookup&query=${number}`;" },
  { match: /const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/telegram\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{telegramId\}`;/, repl: "const endpoint = `/api/user-lookup?service=telegram&query=${telegramId}`;" },
  { match: /const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/identity\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{encodeURIComponent\(aadharNo\)\}`;/, repl: "const endpoint = `/api/user-lookup?service=identity&query=${encodeURIComponent(aadharNo)}`;" },
  { match: /const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/bank\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{encodeURIComponent\(ifsc\)\}`;/, repl: "const endpoint = `/api/user-lookup?service=bank&query=${encodeURIComponent(ifsc)}`;" },
  { match: /const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/vehicle\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{cleanVehicleNo\}`;/, repl: "const endpoint = `/api/user-lookup?service=vehicle&query=${cleanVehicleNo}`;" },
  { match: /const endpoint = `\$\{renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)\}\/api\/pancard\?key=TX-SYSTEM-INTERNAL-ADMIN&query=\$\{cleanPancardNo\}`;/, repl: "const endpoint = `/api/user-lookup?service=pancard&query=${cleanPancardNo}`;" }
];

endpointsToFix.forEach(fix => {
  code = code.replace(fix.match, fix.repl);
});

// We need to inject the JWT token into the fetch headers
const tokenInject = `
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const response = await fetch(backendEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': \`Bearer \${token}\`
      }
    });
`;
code = code.replace(/const response = await fetch\(backendEndpoint\)/, tokenInject.replace('backendEndpoint', 'backendEndpoint').replace(/,\s*\{\s*method: 'GET',\s*mode: 'cors',\s*headers: \{\s*'Accept': 'application\/json'\s*\}\s*\}/g, ''));

const tokenInjectGeneric = `
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': \`Bearer \${token}\`
      }
    });
`;
code = code.replace(/const response = await fetch\(endpoint, \{\s*method: 'GET',\s*mode: 'cors',\s*headers: \{\s*'Accept': 'application\/json'\s*\}\s*\}\);/g, tokenInjectGeneric);

// But we need to make sure we replace it correctly for lookup
code = code.replace(/const response = await fetch\(backendEndpoint, \{\s*method: 'GET',\s*mode: 'cors',\s*headers: \{\s*'Accept': 'application\/json'\s*\}\s*\}\);/g, tokenInjectGeneric.replace(/endpoint/g, 'backendEndpoint'));

fs.writeFileSync('src/services/api.ts', code);
console.log('Patched frontend API');
