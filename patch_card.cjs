const fs = require('fs');
let code = fs.readFileSync('src/components/FormattedResponseCard.tsx', 'utf8');

const target = `const BANNED_KEYS = [
  "raw_results", "raw_response", "raw_data", "raw_feed", "json_data", "raw", "original_response",
  'developer', 'owner', 'buy_api', 'provider', 'credits', 'telegram', 'site', 
  'website', 'api_buy_link', 'website_link', 'support', 'contact', 'bought_from',
  'vendor', 'bot_owner', 'channel', 'dev', 'admin', 'bot', 'seller', 'paid_by', 
  'copyright', 'created_by', 'tg_channel', 'tg_owner'
];`;

const replacement = `const BANNED_KEYS = [
  'developer', 'owner', 'buy_api', 'provider', 'credits', 'telegram', 'site', 
  'website', 'api_buy_link', 'website_link', 'support', 'contact', 'bought_from',
  'vendor', 'bot_owner', 'channel', 'dev', 'admin', 'bot', 'seller', 'paid_by', 
  'copyright', 'created_by', 'tg_channel', 'tg_owner'
];`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/FormattedResponseCard.tsx', code);
