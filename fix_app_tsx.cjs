const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The problematic block:
//    if (service === 'aadhaar_to_pan') {
//      // Checked securely on backend
//    } else {
//      // Checked securely on backend credits to perform this lookup.`);
//        handleOpenPricing();
//        return;
//      }
//    }

code = code.replace(/if \(service === 'aadhaar_to_pan'\) \{[\s\S]*?return;\n\s*\}\n\s*\}/, `
    // Credit checks are now handled securely on the backend.
    // If the backend returns 403 Insufficient Credits, we will handle it in the response below.
`);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx syntax error');
