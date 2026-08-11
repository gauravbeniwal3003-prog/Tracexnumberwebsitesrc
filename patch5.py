import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any occurrence of "Telegram Match" with just the object
pattern = r'"Telegram Match":\s*\{\s*"name":\s*(.+?),\s*"telegram_id":\s*(.+?),\s*"mobile":\s*(.+?),\s*"father_name":\s*".+?",\s*"alt_mobile":\s*".+?",\s*"email":\s*".+?",\s*"operator":\s*".+?",\s*"state_circle":\s*".+?",\s*"address":\s*".+?",\s*"platform":\s*"Telegram Lookup"\s*\}'
replacement = r'"telegram_id": \2, "username": \1, "mobile": \3, "platform": "Telegram Lookup"'
content = re.sub(pattern, replacement, content)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
