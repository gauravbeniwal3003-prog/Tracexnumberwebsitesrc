const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `} else if (result.results) {
        targetObj = result.results;
      } else {
        targetObj = result;
      }`;

const replacement = `} else if (result.results && Object.keys(result.results).length > 0) {
        targetObj = result.results;
      } else {
        targetObj = result;
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
