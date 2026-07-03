const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const searchLimiter = `// Specific Rate Limiters for sensitive endpoints
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: { error: 'Too many requests!' }
});
app.use('/api/user-lookup', searchLimiter);
app.use('/api/lookup', searchLimiter);
app.use('/api/aadhaar-to-pan', searchLimiter);
app.use('/api/panfind', searchLimiter);`;

server = server.replace(/\/\/ Specific Rate Limiters for sensitive endpoints/, searchLimiter);

fs.writeFileSync('server.ts', server);
console.log('Fixed rate limit.');
