const fs = require('fs');
const files = [
  'src/components/ProtectNumberModal.tsx',
  'src/components/SubscriptionModal.tsx',
  'src/pages/BuyCredits.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/          'Authorization': `Bearer \$\{token\}`\n          'Authorization': `Bearer \$\{session\.access_token\}`/g, "          'Authorization': `Bearer \${session.access_token}`");
  fs.writeFileSync(file, content);
}
console.log('Fixed syntax 2.');
