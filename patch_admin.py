import re

with open('src/pages/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make all cards use liquid glass theme
content = content.replace('bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden', 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-2xl overflow-hidden')
content = content.replace('bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6', 'bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 rounded-3xl p-8 space-y-6')
content = content.replace('p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col h-[480px]', 'p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 flex flex-col h-[480px]')
content = content.replace('p-6 rounded-3xl bg-white border border-slate-200 shadow-sm', 'p-6 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5')
content = content.replace('p-5 rounded-2xl bg-white border border-slate-200 shadow-sm', 'p-5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5')

with open('src/pages/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

