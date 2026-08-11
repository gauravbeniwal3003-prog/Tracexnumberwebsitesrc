import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Lines 2598, 2601, 2604:
content = re.sub(r'target_template = "https://exploitsindia\.site//anish-private-api//number\.php\?exploits="', r'target_template = get_provider_url("phone", "")', content)

content = re.sub(r'final_url = f"https://exploitsindia\.site//anish-private-api//number\.php\?exploits=\{num\}"', r'final_url = get_provider_url("phone", num)', content)

# 5489: url = f"https://exploitsindia.site/anish-private-api/number.php?exploits={clean_phone}"
content = re.sub(r'url = f"https://exploitsindia\.site/anish-private-api/number\.php\?exploits=\{clean_phone\}"', r'url = get_provider_url("phone", clean_phone)', content)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

