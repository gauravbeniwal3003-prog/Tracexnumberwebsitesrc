import re

with open('src/pages/ApiDocs.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace bg-white with glassmorphic background
content = content.replace('bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs', 'bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5')
content = content.replace('bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs', 'bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5')
content = content.replace('bg-white shadow-2xs', 'bg-white/60 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5')
content = content.replace('bg-white hover:bg-slate-50/80 p-4.5', 'bg-white/50 backdrop-blur-md hover:bg-white/80 p-4.5')
content = content.replace('bg-white border border-slate-200/80 rounded-2xl', 'bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5')

with open('src/pages/ApiDocs.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

