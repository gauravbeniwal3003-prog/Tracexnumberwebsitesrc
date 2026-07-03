const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const hasUnlimitedAction =')) {
  code = code.replace(/const \[cooldown, setCooldown\] = useState\(0\);/,
    `const [cooldown, setCooldown] = useState(0);

  const hasUnlimitedAction = () => {
    if (!profile?.unlimited_expiry) return false;
    return new Date(profile.unlimited_expiry) > new Date();
  };`);
  fs.writeFileSync('src/App.tsx', code);
}
