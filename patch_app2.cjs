const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `const hasValidData = !!(data.results || data.raw_results);
         
      if (data.status && hasValidData) {
        setResult(data);
        setCooldown(5);
      } else {
        setError(data.error || "Sorry, we don't have data related to the query.");
      }`;

const replacement = `const hasValidData = !!(data.results || data.raw_results || data.error);
         
      if (data.status === false && !data.results && !data.raw_results && data.error && (data.error.includes('credits') || data.error.includes('sign in') || data.error.includes('protected'))) {
        setError(data.error);
      } else {
        setResult(data);
        setCooldown(5);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
