const fs = require('fs');
let api = fs.readFileSync('src/services/api.ts', 'utf8');

api = api.replace(/\/api\/lookup\?key=[^&]+&query=/g, "/api/user-lookup?service=phone&query=");
api = api.replace(/\/api\/telegram\?key=[^&]+&query=/g, "/api/user-lookup?service=telegram&query=");
api = api.replace(/\/api\/identity\?key=[^&]+&query=/g, "/api/user-lookup?service=adhr&query=");
api = api.replace(/\/api\/bank\?key=[^&]+&query=/g, "/api/user-lookup?service=bnk&query=");
api = api.replace(/\/api\/vehicle\?key=[^&]+&query=/g, "/api/user-lookup?service=vehicle&query=");
api = api.replace(/\/api\/pancard\?key=[^&]+&query=/g, "/api/user-lookup?service=pancard&query=");

fs.writeFileSync('src/services/api.ts', api);
console.log('Fixed src/services/api.ts endpoints.');
