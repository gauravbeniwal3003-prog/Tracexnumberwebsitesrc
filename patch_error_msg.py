import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace "api error" or similar generic errors with "Sorry, we don't have data related to the query."
content = re.sub(r'err\.message \|\| "(Failed to search record.*?)"', 'err.message && !err.message.includes("api error") ? err.message : "Sorry, we don\'t have data related to the query."', content)

# Modify validateLookupResponse or parseLookupResults if they return generic errors
# But wait, the error from server is passed directly.

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
