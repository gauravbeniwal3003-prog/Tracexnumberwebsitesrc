import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all instances of `message: "api error"` with `message: "Sorry, we don't have data related to the query."`
content = content.replace('message: "api error"', 'message: "Sorry, we don\'t have data related to the query."')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
