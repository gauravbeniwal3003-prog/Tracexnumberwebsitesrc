const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove the client-side credit deduction logic.
code = code.replace(/await supabase\n\s*\.from\('profiles'\)\n\s*\.update\(\{ credits: Math\.max\(0, \(profile\?\.credits \|\| 0\) - creditCost\) \}\)\n\s*\.eq\('id', profile\.id\);/g, '// Credit deducted securely on backend');

code = code.replace(/await supabase\.from\('profiles'\)\.update\(\{ credits: Math\.max\(0, \(profile\?\.credits \|\| 0\) - creditCost\) \}\)\.eq\('id', profile\.id\);/g, '// Credit deducted securely on backend');

code = code.replace(/if \(\(profile\?\.credits \|\| 0\) < creditCost\) \{[\s\S]*?Aadhaar to PAN is not included[\s\S]*?\}/, '// Checked securely on backend');
code = code.replace(/if \(\!hasUnlimitedAction\(\) && \(profile\?\.credits \|\| 0\) < creditCost\) \{[\s\S]*?Insufficient credits[\s\S]*?\}/, '// Checked securely on backend');

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx');
