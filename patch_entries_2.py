import re

with open('src/components/FormattedResponseCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to ensure if result is a raw string JSON, it renders properly in json view.
# Currently email defaults to JSON view and the mode switcher is hidden for email.
# The user issue: "And at other places fix that it is coming result double time 1 in Jason and one in formatted way the user should see only informated way but a normally he can switch formatted into Jason by a switching button which you have already provided there"
# This suggests that SOMEWHERE ELSE (not email), it is showing BOTH JSON and formatted at the same time? No, it means inside the formatted view it's showing the raw JSON as one of the entries! 
# Like: key="RESPONSE", value='{"status":"success", ...}'
# Ah, I commented out `entries.push(['RESPONSE', trimmed])`. This prevents the raw json string from being added to the formatted entries! This fixes the double output.

# Also, the user says "In email id lookup removed formatted lookup result card I want only Jason there".
# I've already set `isEmail ? 'json' : 'formatted'` and hidden the switcher for email! 

with open('src/components/FormattedResponseCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
