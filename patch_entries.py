import re

with open('src/components/FormattedResponseCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I want the email id lookup to NOT use JSON string display, I mean in the formatted view, it shouldn't show duplicated data if we only show JSON. Wait. "email id lookup removed formatted lookup result card I want only Jason there"

# Since `!isEmail && (...)` hides the switcher, `viewMode` is forced to 'json' because `isEmail ? 'json' : 'formatted'` in `useState`. However, the user said "And at other places fix that it is coming result double time 1 in Jason and one in formatted way the user should see only informated way but a normally he can switch formatted into Jason by a switching button which you have already provided there"

# If the result comes double time (one in JSON, one in formatted way), it means BOTH the JSON and the Formatted list are being rendered at the same time somewhere, or `getFormattedResponse` wraps the string inside a JSON property. Let's see what getCleanJsonData does.

content = content.replace("            entries.push(['RESPONSE', trimmed]);", "            // entries.push(['RESPONSE', trimmed]);")

with open('src/components/FormattedResponseCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
