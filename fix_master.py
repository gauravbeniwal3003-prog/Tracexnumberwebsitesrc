with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("if (!isMaster && user && user.email) {", "if (user && user.email) {")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed isMaster")
