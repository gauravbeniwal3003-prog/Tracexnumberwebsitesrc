const fs = require('fs');

const files = [
  'src/components/ProtectNumberModal.tsx',
  'src/components/SubscriptionModal.tsx',
  'src/pages/BuyCredits.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const response = await fetch\(`\$\{backendUrl\.replace\(\/\\\\\/\\$\/, ""\)\}\/api\/cashfree\/create-order`, \{\n\s*method: 'POST',\n\s*headers: \{\n\s*'Content-Type': 'application\/json'\n\s*\}/,
    `const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';
      const response = await fetch(\`\${backendUrl.replace(/\\/$/, "")}/api/cashfree/create-order\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        }`);
  fs.writeFileSync(file, content);
}
console.log('Added auth token to frontend requests.');
