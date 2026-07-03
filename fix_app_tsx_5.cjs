const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /      \];\n    \} else if \(service === 'telegram'\) \{\n      if \(targetVal\.length < 3\) \{/g;
const match = regex.exec(code);

if (match) {
  code = code.replace(regex, `      ];
    }
    
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMessage(messages[i]);
    }, 800);
    return () => clearInterval(interval);
  }, [isLoading, service]);

  const handleSearch = async (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (!user) {
      setError('Please sign in to access TRACEXDATA Intelligence.');
      // handleOpenPricing(); // Assume it exists
      return;
    }
    if (cooldown > 0) {
      setError(\`System cooling down. Please wait \${cooldown}s before next query.\`);
      return;
    }

    const targetVal = forceQuery || phoneNumber.trim();
    if (!targetVal) return;

    if (service === 'phone') {
      if (targetVal.length < 10) {
        setError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else if (service === 'telegram') {
      if (targetVal.length < 3) {`);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Fixed handleSearch definition!');
} else {
  console.log('Regex did not match');
}
