const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. claim-manual validation
const claimManualVal = `
app.post("/api/cashfree/claim-manual", async (req, res) => {
  const { order_id } = req.body;
  if (!order_id || typeof order_id !== 'string' || order_id.trim().length === 0 || order_id.length > 100) {
    return res.status(400).json({ error: "Please supply a valid Cashfree Order ID." });
  }
`;
code = code.replace(
  /app\.post\("\/api\/cashfree\/claim-manual", async \(req, res\) => \{\n\s*const \{ order_id \} = req\.body;\n\s*if \(\!order_id\) \{\n\s*return res\.status\(400\)\.json\(\{ error: "Please supply a valid Cashfree Order ID\." \}\);\n\s*\}/,
  claimManualVal
);

// 2. /api/cashfree/status/:order_id validation
const statusOrderVal = `
app.get("/api/cashfree/status/:order_id", async (req, res) => {
  try {
    const order_id = req.params.order_id;
    if (!order_id || typeof order_id !== 'string' || order_id.trim().length === 0 || order_id.length > 100) {
      return res.status(400).json({ error: "Invalid Order ID." });
    }
`;
code = code.replace(
  /app\.get\("\/api\/cashfree\/status\/:order_id", async \(req, res\) => \{\n\s*try \{\n\s*const order_id = req\.params\.order_id;/,
  statusOrderVal
);

// 3. /api/lookup input validation
const lookupVal = `
app.get("/api/lookup", async (req, res) => {
  const { service, target } = req.query;
  if (!service || typeof service !== 'string' || service.length > 50) {
    return res.status(400).json({ error: "Invalid service requested" });
  }
  if (!target || typeof target !== 'string' || target.length > 100) {
    return res.status(400).json({ error: "Invalid target requested" });
  }
`;
code = code.replace(
  /app\.get\("\/api\/lookup", async \(req, res\) => \{\n\s*const \{ service, target \} = req\.query;/,
  lookupVal
);

fs.writeFileSync('server.ts', code);
console.log('Patched second set of inputs');
