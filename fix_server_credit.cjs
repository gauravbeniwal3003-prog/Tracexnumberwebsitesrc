const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/    const creditCost = 1;/g,
`    let creditCost = 1;
    if (service === 'telegram') {
      creditCost = 8;
    } else if (service === 'adhr') {
      creditCost = 12;
    } else if (service === 'bnk') {
      creditCost = 18;
    } else if (service === 'vehicle') {
      creditCost = 10;
    } else if (service === 'pancard') {
      creditCost = 20;
    } else if (service === 'aadhaar_to_pan') {
      creditCost = 150;
    }`);

fs.writeFileSync('server.ts', code);
