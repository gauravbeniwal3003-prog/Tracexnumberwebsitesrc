const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

const target = `    // 2. Handle "No Record Found" early
    if (data?.message?.toLowerCase().includes('no record') || 
        data?.error?.toLowerCase().includes('no record') ||
        (hasStatus && !rawResults)) {
      return { status: false, results: {}, error: "Sorry, we don't have data related to the query." };
    }`;

const replacement = `    // 2. Check removed so UI can see exact API JSON response`;

code = code.replace(target, replacement);
fs.writeFileSync('src/services/api.ts', code);
