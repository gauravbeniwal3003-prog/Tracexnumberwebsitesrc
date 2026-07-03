const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const correctCode = `
      ];
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
      handleOpenPricing();
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
`;

// It should replace everything from '      ];\n    } else if (service === 'telegram') {'
code = code.replace(/      \];\n    \} else if \(service === 'telegram'\) \{/, correctCode);

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed handleSearch definition');
