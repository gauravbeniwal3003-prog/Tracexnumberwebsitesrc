import re

with open('src/components/FormattedResponseCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the viewMode state initialization
old_state = '''  const isNumber = isNumberLookupService(serviceType, data);
  // Number lookup defaults to formatted view, all others default to pretty JSON
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>(isNumber ? 'formatted' : 'json');'''

new_state = '''  const isEmail = serviceType?.toLowerCase().trim() === 'email';
  // Email defaults to JSON and ONLY JSON, everything else defaults to formatted
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>(isEmail ? 'json' : 'formatted');'''

content = content.replace(old_state, new_state)

with open('src/components/FormattedResponseCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
