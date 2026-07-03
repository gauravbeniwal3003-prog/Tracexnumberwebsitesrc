const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

const newLines = `      ];
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
    } else if (service === 'telegram') {`.split('\n');

lines.splice(238, 2, ...newLines);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Fixed handleSearch definition with array splice!');
