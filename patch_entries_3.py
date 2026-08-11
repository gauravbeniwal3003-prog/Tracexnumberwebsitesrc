import re

with open('src/components/FormattedResponseCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("          entries.push(['RESPONSE', trimmed]);", "          // entries.push(['RESPONSE', trimmed]);")

with open('src/components/FormattedResponseCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
