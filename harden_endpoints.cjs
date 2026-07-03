const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// Require authentication for /api/cashfree/create-order
// Replace the start of the endpoint with an authenticated version.
const createOrderRegex = /app\.post\("\/api\/cashfree\/create-order", async \(req, res\) => \{\n  const isPgPay = req\.body\?\.plan_id === "pgpay_manual" \|\| req\.body\?\.plan_id === "panfind";/;

const newCreateOrder = `app.post("/api/cashfree/create-order", async (req, res) => {
  const isPgPay = req.body?.plan_id === "pgpay_manual" || req.body?.plan_id === "panfind";
  
  let authenticatedUserId = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (supabaseAdmin) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        authenticatedUserId = user.id;
      }
    }
  }

  if (!isPgPay && !authenticatedUserId) {
    return res.status(401).json({ error: "Unauthorized. Authentication required to create an order." });
  }

  // Override user_id with the authenticated user ID (prevent IDOR)
  if (!isPgPay && authenticatedUserId) {
    req.body.user_id = authenticatedUserId;
  }
`;

server = server.replace(createOrderRegex, newCreateOrder);

fs.writeFileSync('server.ts', server);
console.log('Endpoint /api/cashfree/create-order hardened.');
