import re

with open("server.ts", "r") as f:
    content = f.read()

old = """const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);"""

new = """const __filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url || 'file://' + process.cwd() + '/server.ts');
const __dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename);"""

content = content.replace(old, new)

with open("server.ts", "w") as f:
    f.write(content)
