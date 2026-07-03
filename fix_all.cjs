const fs = require('fs');

// Fix server.ts __filename
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(/const __filename = __filename;/g, "");
fs.writeFileSync('server.ts', server);

// Fix src/services/api.ts
let api = fs.readFileSync('src/services/api.ts', 'utf8');
api = api.replace(/renderBackendUrl\.replace\(\/\\\\\/\\$\/, ''\)/g, "''");
fs.writeFileSync('src/services/api.ts', api);

// Fix src/App.tsx missing state variables
let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.includes('const [error, setError] =')) {
  app = app.replace(/const \[cooldown, setCooldown\] = useState\(0\);/,
    `const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);`);
}

if (!app.includes('const handleOpenLogin =')) {
  app = app.replace(/const navigate = useNavigate\(\);/,
    `const navigate = useNavigate();
  const handleOpenLogin = () => {};
  const handleOpenPricing = () => {};
  const handleOpenProtect = () => {};`);
}
fs.writeFileSync('src/App.tsx', app);
