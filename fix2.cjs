const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/    \/\/ Check credits\/subscription\n    if \(service === 'aadhaar_to_pan'\) \{\n      \/\/ Checked securely on backend\n    \} else \{\n      \/\/ Checked securely on backend credits to perform this lookup\.\`\);\n        handleOpenPricing\(\);\n        return;\n      \}\n    \}/g,
  `
    // Credit checks are now handled securely on the backend.
  `);

fs.writeFileSync('src/App.tsx', code);
