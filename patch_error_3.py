import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure all error messages are "Sorry, we don't have data related to the query."
content = re.sub(r'error: "No record found\."', 'error: "Sorry, we don\'t have data related to the query."', content)
content = re.sub(r'error: "No Record Found for this number\."', 'error: "Sorry, we don\'t have data related to the query."', content)

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
