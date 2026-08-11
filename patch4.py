import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Telegram Match logic inside the Telegram endpoint
old_protected = """                protected_results = {
                    "Telegram Match": {
                        "name": "PROTECTED RECORD",
                        "telegram_id": telegram_id if telegram_id != "N/A" else targetTelegramId,
                        "mobile": "PROTECTED @ TRACEX SHIELD",
                        "father_name": "PROTECTED @ TRACEX SHIELD",
                        "alt_mobile": "PROTECTED @ TRACEX SHIELD",
                        "email": "PROTECTED @ TRACEX SHIELD",
                        "operator": "PROTECTED @ TRACEX SHIELD",
                        "state_circle": "PROTECTED @ TRACEX SHIELD",
                        "address": "PROTECTED @ TRACEX SHIELD",
                        "platform": "Telegram Lookup"
                    }
                }"""

new_protected = """                protected_results = {
                    "telegram_id": telegram_id if telegram_id != "N/A" else targetTelegramId,
                    "username": "PROTECTED RECORD",
                    "mobile": "PROTECTED @ TRACEX SHIELD",
                    "platform": "Telegram Lookup"
                }"""
content = content.replace(old_protected, new_protected)

old_unprotected = """            results = {
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

new_unprotected = """            results = {
                "telegram_id": telegram_id,
                "username": username,
                "mobile": phone,
                "platform": "Telegram Lookup"
            }"""
content = content.replace(old_unprotected, new_unprotected)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

