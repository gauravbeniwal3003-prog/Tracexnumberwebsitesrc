import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace "No records found" and other generic errors with "Sorry, we don't have data related to the query."
content = re.sub(r'error: rawData\?\.results\?\.error \|\| rawData\?\.message \|\| "No records found"', 'error: rawData?.results?.error || rawData?.message || "Sorry, we don\'t have data related to the query."', content)

content = re.sub(r"error: 'No Record Found for this number.'", 'error: "Sorry, we don\'t have data related to the query."', content)
content = re.sub(r'error: err\.message \|\| "Failed to search record"', 'error: err.message && !err.message.includes("api error") ? err.message : "Sorry, we don\'t have data related to the query."', content)

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
