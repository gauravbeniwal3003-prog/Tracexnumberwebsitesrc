const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetRegex = /const hasValidData = !!\(data\.results \|\| data\.raw_results\);[\s\n]+if \(data\.status && hasValidData\) \{[\s\n]+setResult\(data\);[\s\n]+setCooldown\(5\);[\s\n]+\} else \{[\s\n]+setError\(data\.error \|\| "Sorry, we don't have data related to the query\."\);[\s\n]+\}/;

const replacement = `const hasValidData = !!(data.results || data.raw_results || data.error);
         
      if (data.status === false && !data.results && !data.raw_results && data.error && (data.error.includes('credits') || data.error.includes('sign in') || data.error.includes('protected'))) {
        setError(data.error);
      } else {
        setResult(data);
        setCooldown(5);
      }`;

if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patch applied successfully");
} else {
    console.log("Could not find target in App.tsx");
}
