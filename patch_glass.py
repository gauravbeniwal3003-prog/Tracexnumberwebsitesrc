import re

with open('src/components/DashboardServicesView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace bg-white with glassmorphic background for the main card (line 310)
content = content.replace(
    'bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 border-t-4 border-t-blue-600',
    'bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 space-y-4 border-t-4 border-t-blue-500'
)

# Search input (line 369)
content = content.replace(
    'bg-white border border-slate-200/90 rounded-2xl',
    'bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
)

# Category Header card (line 374)
content = content.replace(
    'rounded-3xl border border-slate-200/90 bg-white',
    'rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5'
)

# Services list items (line 402)
content = content.replace(
    'bg-white hover:bg-blue-50/40 hover:border-blue-300',
    'bg-white/50 backdrop-blur-lg hover:bg-white/80 hover:border-white'
)

# Categories list items (line 460)
content = content.replace(
    'bg-white hover:bg-slate-50/80 hover:border-blue-200',
    'bg-white/50 backdrop-blur-lg hover:bg-white/80 hover:border-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5'
)

with open('src/components/DashboardServicesView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

