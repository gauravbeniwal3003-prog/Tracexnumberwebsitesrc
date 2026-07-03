const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\} else     \/\/ Credit checks are now handled securely on the backend.\n    \/\/ If the backend returns 403 Insufficient Credits, we will handle it in the response below.\n else if \(service === 'telegram'\)/,
  `
    } else if (service === 'telegram')
  `);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx syntax error 2');
