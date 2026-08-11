const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `let actualError = data.error;
      if (data.results && data.results.error) {
        actualError = data.results.error;
        data.results = null;
      }
      
      const hasValidData = (data.results && Object.keys(data.results).length > 0) || (data.raw_results && data.raw_results.trim().length > 0);
            
      if (data.status && hasValidData) {
        // Render results IMMEDIATELY
        setResult(data);
        setCooldown(5);
      } else {
        setError(actualError || "Sorry, we don't have data related to the query.");
      }`;

const replacement = `const hasValidData = !!(data.results || data.raw_results);
      
      if (data.status && hasValidData) {
        setResult(data);
        setCooldown(5);
      } else {
        setError(data.error || "Sorry, we don't have data related to the query.");
      }`;

// since the indentation might not match perfectly, let's use a regex
code = code.replace(/let actualError = data\.error;[\s\S]*?setError\(actualError \|\| "Sorry, we don't have data related to the query\."\);\s*\}/, replacement);
fs.writeFileSync('src/App.tsx', code);
