const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /if \(claim\.status === "success" \|\| claim\.status === "consumed"\) \{[\s\S]*?return res\.status\(403\)\.json\(\{ error: "This payment has already been consumed\. Please generate a new order\." \}\);[\s\S]*?\}/,
  `if (claim.status === "consumed") {
      return res.status(403).json({ error: "This payment has already been consumed. Please generate a new order." });
    }`
);

server = server.replace(
  /await supabaseAdmin\.from\("payment_claims"\)\.update\(\{ status: "consumed" \}\)\.eq\("payment_id", order_id\);/,
  `// Atomic consumption
    const { data: consumeResult, error: consumeErr } = await supabaseAdmin
      .from("payment_claims")
      .update({ status: "consumed" })
      .eq("payment_id", order_id)
      .neq("status", "consumed")
      .select();

    if (consumeErr || !consumeResult || consumeResult.length === 0) {
      return res.status(403).json({ error: "This payment was already consumed or could not be locked." });
    }`
);

fs.writeFileSync('server.ts', server);
console.log('Fixed panfind atomic consumption.');
