const fs = require('fs');
const files = ['server.ts', 'server.py'];
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\(tech\[\\s\\-_\]\*vishal\|/g, "(tech[\\s\\-_]*vishal(?:[\\s\\-_]*boss)?|");
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
