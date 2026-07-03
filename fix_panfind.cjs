const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const panFindEndpointRegex = /\/\/ PAN Find secure payment lookup endpoint[\s\S]*?function scrubAllBranding/m;

const newPanFindEndpoint = `// PAN Find secure payment lookup endpoint
app.get("/api/panfind", async (req, res) => {
  const { order_id, aadhaar_number } = req.query;
  if (!order_id || !aadhaar_number) {
    return res.status(400).json({ error: "Missing required query parameters: order_id and aadhaar_number" });
  }

  const targetAadhaar = String(aadhaar_number).trim();
  if (!/^\\d{12}$/.test(targetAadhaar)) {
    return res.status(400).json({ error: "Aadhaar number must be exactly 12 digits" });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Backend not configured" });
    }

    // 0. IDOR / Replay Attack Prevention
    // Check if this order_id was already consumed in payment_claims table
    const { data: claim, error: claimErr } = await supabaseAdmin
      .from("payment_claims")
      .select("*")
      .eq("payment_id", order_id)
      .single();
      
    if (claimErr || !claim) {
      return res.status(404).json({ error: "Order not found in database. Cannot verify payment." });
    }
    
    if (claim.status === "success" || claim.status === "consumed") {
      return res.status(403).json({ error: "This payment has already been consumed. Please generate a new order." });
    }

    let order_status = "";
    
    // 1. Verify payment status with Cashfree
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      const renderBackendUrl = "https://tracexdata-api.onrender.com";
      const response = await fetch(\`\${renderBackendUrl}/api/cashfree/status/\${order_id}\`);
      const data: any = await response.json();
      order_status = data.order_status;
    } else {
      const response = await fetch(\`\${CASHFREE_BASE_URL}/orders/\${order_id}\`, {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01'
        }
      });
      const data: any = await response.json();
      order_status = data.order_status;
    }

    if (order_status !== "PAID") {
      return res.status(402).json({ error: "Payment verification failed. Please complete the Rs. 150 payment." });
    }

    // Mark as consumed immediately to prevent race conditions (re-entrancy)
    await supabaseAdmin.from("payment_claims").update({ status: "consumed" }).eq("payment_id", order_id);

    // 2. Execute target API lookup
    const apiKey = "c8117598aafa71238a4bf8377087b0ff";
    const api_url = \`https://techvishalboss.com/panfind/api.php?api_key=\${apiKey}&aadhaar_number=\${targetAadhaar}\`;
    
    const apiResponse = await fetch(api_url);
    if (!apiResponse.ok) {
      return res.status(502).json({ error: "External verification gateway offline. Please contact support." });
    }

    const rawText = await apiResponse.text();
    let apiData: any;
    try {
      apiData = JSON.parse(rawText);
    } catch (e) {
      apiData = { error: "Failed to parse search output", raw: rawText };
    }

    // 3. Remove "developer": "@techvishalboss" from the response object
    if (apiData && typeof apiData === "object") {
      delete apiData.developer;
    }

    return res.json(apiData);
  } catch (error: any) {
    console.error("PAN Find error:", error);
    return res.status(500).json({ error: "Internal server error during processing lookup" });
  }
});

// Deep Case-Insensitive Branding and Provider Info Scrubber
function scrubAllBranding`;

server = server.replace(panFindEndpointRegex, newPanFindEndpoint);
fs.writeFileSync('server.ts', server);
console.log('Fixed PAN Find.');
