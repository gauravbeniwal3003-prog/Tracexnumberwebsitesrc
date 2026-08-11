import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all 'No records found...' generic errors
content = re.sub(r"'No records found for this (Identity Card|Bank/IFSC|Vehicle Number|PN Card|Email|number)\.'", '"Sorry, we don\'t have data related to the query."', content)
content = re.sub(r'"No records found for this query\."', '"Sorry, we don\'t have data related to the query."', content)
content = re.sub(r"'No records found for this Telegram ID\.'", '"Sorry, we don\'t have data related to the query."', content)

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content_app = f.read()

content_app = content_app.replace("'No records found for this query. If any credits were charged, they have been automatically refunded.'", '"Sorry, we don\'t have data related to the query."')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content_app)

