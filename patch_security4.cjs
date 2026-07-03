const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const lookupVal = `
  // Input Validation
  if (service && (typeof service !== 'string' || service.length > 50)) {
    return res.status(400).json({ status: "error", message: "Invalid service requested" });
  }
`;

code = code.replace(
  /if \(\!key\) return res\.status\(401\)\.json\(\{ status: "error", message: "API key is required" \}\);/,
  `if (!key) return res.status(401).json({ status: "error", message: "API key is required" });\n${lookupVal}`
);

fs.writeFileSync('server.ts', code);
console.log('Patched lookup');
