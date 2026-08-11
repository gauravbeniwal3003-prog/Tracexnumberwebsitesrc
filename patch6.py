import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = """                results = {
                    "Telegram Match": {
                        "name": username,
                        "telegram_id": telegram_id,
                        "mobile": phone,
                        "father_name": "N/A",
                        "alt_mobile": country_code,
                        "email": "N/A",
                        "operator": country,
                        "state_circle": "N/A",
                        "address": "N/A",
                        "platform": "Telegram Lookup"
                    }
                }"""
new = """                results = {
                    "telegram_id": telegram_id,
                    "username": username,
                    "mobile": phone,
                    "platform": "Telegram Lookup"
                }"""
content = content.replace(old, new)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
