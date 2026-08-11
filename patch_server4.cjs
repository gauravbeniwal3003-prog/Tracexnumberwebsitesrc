const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    // Log history
    const finalStatus = hasRealData ? 'success' : 'not_found';
    if (!hasRealData) {
      if (user && user.email) {
         await autoRefundUserCredits(user.email, creditCost, service, cleanedQuery, supabaseAdmin);
      }
    }
    await logSearchHistory(req, service, cleanedQuery, finalStatus, client);

    return res.status(200).json({
      status: "success",
      results: cleanedData
    });`;

const replacement = `    // Log history
    const finalStatus = hasRealData ? 'success' : 'not_found';
    if (!hasRealData) {
      if (user && user.email) {
         await autoRefundUserCredits(user.email, creditCost, service, cleanedQuery, supabaseAdmin);
      }
    }
    await logSearchHistory(req, service, cleanedQuery, finalStatus, client);

    if (service === 'telegram' && typeof cleanedData === 'object' && cleanedData !== null && 'status' in cleanedData) {
      return res.status(200).json(cleanedData);
    }

    return res.status(200).json({
      status: "success",
      results: cleanedData
    });`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
