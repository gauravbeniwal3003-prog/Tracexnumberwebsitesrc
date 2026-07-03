const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const oldCode = `    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", orderId)
      .single();

    if (claimErr || !claim || claim.status === "success") return;`;

const newCode = `    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", orderId)
      .single();

    if (claimErr || !claim || claim.status === "success" || claim.status === "consumed") return;

    // Atomic Lock
    const { data: lockResult, error: lockErr } = await supabaseAdmin
      .from("payment_claims")
      .update({ status: "processing" })
      .eq("payment_id", orderId)
      .eq("status", "pending")
      .select();

    if (lockErr || !lockResult || lockResult.length === 0) {
      console.log(\`[RACE CONDITION PREVENTED] Order \${orderId} is already being processed.\`);
      return;
    }`;

server = server.replace(oldCode, newCode);

fs.writeFileSync('server.ts', server);
console.log('Fixed race condition.');
