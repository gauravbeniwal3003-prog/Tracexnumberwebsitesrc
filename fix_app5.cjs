const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace("} else if (service === 'telegram') {} else if (service === 'telegram') {", "} else if (service === 'telegram') {");
fs.writeFileSync('src/App.tsx', app);
