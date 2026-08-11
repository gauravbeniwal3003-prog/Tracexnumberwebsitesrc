const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch 1: Telegram
let target1 = `if (response.ok) {
          const text = await response.text();
          
          let parsedData: any = null;
          try {
             parsedData = JSON.parse(text);
          } catch (e) {
             const jsonMatch = text.match(/\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]/);
             if (jsonMatch) {
               try {
                 parsedData = JSON.parse(jsonMatch[0]);
               } catch (e2) {}
             }
          }
          
          if (parsedData) {
             const cleaned_json = scrubAllBranding(parsedData);
             responseData = cleaned_json.results || cleaned_json.data || cleaned_json;
          } else {
             responseData = { raw_response: scrubAllBranding(text) };
          }
        }`;
let replacement1 = `const text = await response.text();
          
          let parsedData: any = null;
          try {
             parsedData = JSON.parse(text);
          } catch (e) {
             const jsonMatch = text.match(/\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]/);
             if (jsonMatch) {
               try {
                 parsedData = JSON.parse(jsonMatch[0]);
               } catch (e2) {}
             }
          }
          
          if (parsedData) {
             const cleaned_json = scrubAllBranding(parsedData);
             responseData = cleaned_json.results || cleaned_json.data || cleaned_json;
          } else {
             responseData = { raw_response: scrubAllBranding(text) };
          }`;
code = code.replace(target1, replacement1);

// Patch 2: Other services
let target2 = `if (response.ok) {
          const text = await response.text();
          const parsedResults = universalParseAndFormatResponse(text, service, cleanedQuery);
          if (parsedResults && Object.keys(parsedResults).length > 0) {
            responseData = { results: parsedResults };
          } else {
            responseData = text;
          }
        }`;
let replacement2 = `const text = await response.text();
          const parsedResults = universalParseAndFormatResponse(text, service, cleanedQuery);
          if (parsedResults && Object.keys(parsedResults).length > 0) {
            responseData = { results: parsedResults };
          } else {
            responseData = text;
          }`;
code = code.replace(target2, replacement2);

fs.writeFileSync('server.ts', code);
