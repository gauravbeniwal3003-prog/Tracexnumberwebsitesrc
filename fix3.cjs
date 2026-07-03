const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/    \} else if \(service === 'telegram'\) \{\n      if \(targetVal\.length < 3\)/,
  `    }
    
    if (service === 'telegram') {
      if (targetVal.length < 3)`);

fs.writeFileSync('src/App.tsx', code);
