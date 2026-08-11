import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"No records found or search service busy. Please try again."', '"Sorry, we don\'t have data related to the query."')
content = re.sub(r'`No records found for query: \$\{cleanedQuery\}`', '"Sorry, we don\'t have data related to the query."', content)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

