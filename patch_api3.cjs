const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

const target = `    const apiData = await fetchWithFallback(endpoint, 'telegram', cleanTelegram, token);
    
    if (apiData && (apiData.status === 'success' || apiData.status === true) && (apiData.results || apiData.raw_results)) {
      const cleanResults = scrubBranding(apiData.results || {});
      const cleanRawResults = apiData.raw_results ? scrubBranding(apiData.raw_results) : undefined;

      return { 
        status: true,
        results: cleanResults,
        raw_results: cleanRawResults
      };
    } else {
      return {
        status: false,
        results: {},
        error: apiData?.message || apiData?.error || "Sorry, we don't have data related to the query."
      };
    }`;

const replacement = `    const apiData = await fetchWithFallback(endpoint, 'telegram', cleanTelegram, token);
    
    // Forward exact JSON to the UI
    return {
      status: true,
      results: apiData
    };`;

code = code.replace(target, replacement);
fs.writeFileSync('src/services/api.ts', code);
