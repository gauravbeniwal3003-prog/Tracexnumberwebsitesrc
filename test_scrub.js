function scrubAllBranding(obj) {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return obj
      .replace(/(digi[\s\-_]*seva(?:\.in)?|@?digiseva|tech[\s\-_]*vishal(?:[\s\-_]*boss)?|techvishalboss(?:\.com)?|vishal[\s\-_]*boss|osint[\s\-_]*caller|@?osintcaller|u(?:ers|ser)xinfo(?:\.in)?|@?u(?:ers|ser)xinfo|anish[\s\-_]*exploits|exploitsindia(?:\.site)?|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|@?userxinfo)/gi, "")
      .replace(/(by\s+api|developer|developer_name|provider_name|provider_info|buy_api|website_link|api_buy_link|owner_telegram|contact|support|powered_by|credits_to)/gi, "")
      .replace(/(💳\s*BUY\s*API\s*:\s*@?\w+|🆘\s*SUPPORT\s*:\s*@?\w+)/gi, "")
      .replace(/(t\.me\/\w+|https?:\/\/(?:www\.)?\w+\.\w+(?:\/\S*)?)/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => scrubAllBranding(item)).filter(item => item !== null && item !== "" && item !== undefined);
  }
  if (typeof obj === "object") {
    const cleaned = {};
    for (const [key, val] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if ([
        "branding", "api_info", "powered_by", "buy_api", 
        "owner_telegram", "developer", "developer_name", "provider", 
        "provider_info", "api_buy_link", "website_link", "buy", 
        "digiseva", "techvishalboss", "osintcaller", "userxinfo", "credits_to"
      ].includes(lowerKey)) {
        continue;
      }
      cleaned[key] = scrubAllBranding(val);
    }
    return cleaned;
  }
  return obj;
}

const input = {
  "msg": "Details fetched",
  "tg_id": "6379628771",
  "country": "India",
  "country_code": "+91",
  "number": "7217528445",
  "success": true,
  "cached": true,
  "response_time": "35ms",
  "key_details": { "api_id": "1", "api_key": "some_key", "expiry": "2025" },
  "developer": "@UsersXinfo_admin",
  "status_code": 200,
  "http_status": 200
};

console.log(JSON.stringify(scrubAllBranding(input), null, 2));
