const fs = require('fs');
const files = [
  'src/components/ProtectNumberModal.tsx',
  'src/components/SubscriptionModal.tsx',
  'src/pages/BuyCredits.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // We'll look for `headers: {` and inject Authorization just after `Content-Type`.
  // First, ensure we get the session and token before the fetch.
  
  if (content.includes("await fetch") && content.includes("create-order")) {
      content = content.replace(/const response = await fetch\([\s\S]*?headers:\s*\{/, 
      `const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';
      const response = await fetch(\`\${backendUrl.replace(/\\/$/, "")}/api/cashfree/create-order\`, {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,`);
      
      // The backticks will break the original fetch if it used different backticks.
      // Actually, a simpler way is:
  }
}
