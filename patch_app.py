import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Instead of passing getFormattedResponse(), we can just pass the result. 
# getFormattedResponse() seems to just wrap/clean the data and returns string. Wait, if it returns a string, FormattedResponseCard parses it.
# Actually we can just pass the raw result or cleaned result.
# Let's fix DashboardServicesView first if it calls getFormattedResponse() too.

# Change `result || aadhaarPanResult || getFormattedResponse()` to just `result || aadhaarPanResult`
# wait, result is already an object. FormattedResponseCard takes any data. 

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
