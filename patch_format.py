import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Instead of data={result || aadhaarPanResult || getFormattedResponse()}
# Use data={getFormattedResponse()} which already handles combining and cleaning!
# Oh, getFormattedResponse returns a string (JSON string or raw string), FormattedResponseCard parses it well.

content = content.replace('data={result || aadhaarPanResult || getFormattedResponse()}', 'data={getFormattedResponse()}')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
