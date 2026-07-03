const fs = require('fs');
const files = [
  'src/components/ProtectNumberModal.tsx',
  'src/components/SubscriptionModal.tsx',
  'src/pages/BuyCredits.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find the line with `create-order`
  const lines = content.split('\n');
  let newLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('/api/cashfree/create-order')) {
      newLines.push(`      const { data: sessionData } = await supabase.auth.getSession();`);
      newLines.push(`      const token = sessionData?.session?.access_token || '';`);
      newLines.push(lines[i]);
    } else if (lines[i].includes("'Content-Type': 'application/json'")) {
      newLines.push(lines[i] + ',');
      newLines.push(`          'Authorization': \`Bearer \${token}\``);
    } else {
      newLines.push(lines[i]);
    }
  }
  
  fs.writeFileSync(file, newLines.join('\n'));
}
console.log('Fixed');
