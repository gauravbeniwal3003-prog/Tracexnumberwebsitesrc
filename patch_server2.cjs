const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `          if (parsedData) {
             const cleaned_json = scrubAllBranding(parsedData);
             responseData = cleaned_json.results || cleaned_json.data || cleaned_json;
          } else {
             responseData = { raw_response: scrubAllBranding(text) };
          }`;

const replacement = `          if (parsedData) {
             const cleaned_json = scrubAllBranding(parsedData);
             responseData = cleaned_json; // EXACT JSON RESPONSE AS REQUESTED
          } else {
             responseData = { raw_response: scrubAllBranding(text) };
          }`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
