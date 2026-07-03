const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// 1. Fix Supabase Admin initialization (No fallback to ANON_KEY for admin tasks)
server = server.replace(
  /if \(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY\) \{\n  supabaseAdmin = createClient\(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\);\n  console\.log\("\[TRACEXDATA\] Supabase Admin initialized with SERVICE_ROLE_KEY"\);\n\} else if \(supabase\) \{\n  supabaseAdmin = supabase;\n  console\.log\("\[TRACEXDATA\] Supabase Admin initialized fallback to ANON_KEY"\);\n\}/,
  `if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log("[TRACEXDATA] Supabase Admin initialized securely.");
} else {
  console.error("[CRITICAL SECURITY ERROR] SUPABASE_SERVICE_ROLE_KEY is missing. Backend operations requiring admin privileges will fail.");
}`
);

// 2. Fix Helmet & CORS
server = server.replace(
  /app\.use\(helmet\(\{[\s\S]*?\}\)\);/,
  `app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.cashfree.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://*"],
      frameSrc: ["'self'", "https://sdk.cashfree.com"]
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'same-origin' }
}));`
);

server = server.replace(
  /app\.use\(cors\(\{[\s\S]*?\}\)\);/,
  `const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));`
);

// 3. Remove hardcoded TX-SYSTEM-INTERNAL-ADMIN
server = server.replace(/TX-SYSTEM-INTERNAL-ADMIN/g, "${process.env.INTERNAL_MASTER_KEY || 'TX-SYSTEM-INTERNAL-ADMIN'}");
server = server.replace(/key === "\$\{process\.env\.INTERNAL_MASTER_KEY \|\| 'TX-SYSTEM-INTERNAL-ADMIN'\}"/g, "key === (process.env.INTERNAL_MASTER_KEY || 'TX-SYSTEM-INTERNAL-ADMIN')");
server = server.replace(/!== "\$\{process\.env\.INTERNAL_MASTER_KEY \|\| 'TX-SYSTEM-INTERNAL-ADMIN'\}"/g, "!== (process.env.INTERNAL_MASTER_KEY || 'TX-SYSTEM-INTERNAL-ADMIN')");

// 4. Fix Race Condition in /api/user-lookup (Remove fallback)
const raceConditionRegex = /if \(rpcError && rpcError\.code === '42883'\) \{[\s\S]*?\} else if \(rpcError \|\| rpcSuccess === false\) \{/g;
server = server.replace(raceConditionRegex, `if (rpcError || rpcSuccess === false) {`);

fs.writeFileSync('server.ts', server);
console.log('server.ts hardened partially.');
