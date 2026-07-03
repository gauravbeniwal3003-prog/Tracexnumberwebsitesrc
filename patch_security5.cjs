const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const statusVal = `
app.get("/api/cashfree/status/:order_id", async (req, res) => {
  const { order_id } = req.params;
  
  if (!order_id || typeof order_id !== 'string' || order_id.trim().length === 0 || order_id.length > 100) {
    return res.status(400).json({ error: "Invalid Order ID." });
  }

  try {
`;

code = code.replace(
  /app\.get\("\/api\/cashfree\/status\/:order_id", async \(req, res\) => \{\n\s*const \{ order_id \} = req\.params;\n\s*try \{/,
  statusVal
);

fs.writeFileSync('server.ts', code);
console.log('Patched status');
