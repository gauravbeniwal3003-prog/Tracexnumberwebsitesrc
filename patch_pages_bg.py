import os
import re

files_to_patch = [
    'src/pages/SEO.tsx',
    'src/pages/AboutGaurav.tsx',
    'src/pages/PanFind.tsx',
    'src/pages/PgPaymentPage.tsx',
    'src/pages/ScriptPurchase.tsx',
    'src/pages/CallHistoryNumber.tsx',
    'src/pages/ServiceRecords.tsx',
    'src/pages/AdminDashboard.tsx',
    'src/pages/ApiDocs.tsx',
    'src/pages/WalletHistory.tsx',
    'src/pages/BuyCredits.tsx',
    'src/pages/ReferralPage.tsx'
]

for filepath in files_to_patch:
    if not os.path.exists(filepath): continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import if missing
    if 'LiquidBackground' not in content:
        # insert right after last import
        import_stmt = "import LiquidBackground from '../components/LiquidBackground';\n"
        # Find last import
        matches = list(re.finditer(r'^import .*?;?\n', content, re.MULTILINE))
        if matches:
            last_match = matches[-1]
            end_pos = last_match.end()
            content = content[:end_pos] + import_stmt + content[end_pos:]
        else:
            content = import_stmt + content

    # Replace solid bg
    content = re.sub(r'bg-white(\s+text-slate-800)', r'bg-slate-50/50\1', content)
    content = re.sub(r'bg-white(\s+text-slate-900)', r'bg-slate-50/50\1', content)
    
    # insert <LiquidBackground /> right after <div className="... min-h-screen ...">
    # We will use regex to find the main wrapper
    
    pattern = re.compile(r'(<div[^>]*className="[^"]*min-h-screen[^"]*"[^>]*>)\s*')
    
    # Check if it already has LiquidBackground immediately after
    def replacer(m):
        full_match = m.group(0)
        div = m.group(1)
        if '<LiquidBackground' in content[m.end():m.end()+30]:
            return full_match
        return div + '\n      <LiquidBackground />\n      '
        
    content = pattern.sub(replacer, content)

    # Some files use "min-h-screen bg-slate-50/50" already but no LiquidBackground
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch complete.")
