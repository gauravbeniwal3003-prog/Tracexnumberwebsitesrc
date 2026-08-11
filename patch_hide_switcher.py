import re

with open('src/components/FormattedResponseCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_html = '''          {/* Mode Switcher Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">'''

new_html = '''          {/* Mode Switcher Buttons */}
          {!isEmail && (
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">'''

content = content.replace(old_html, new_html)

old_html_end = '''              <Code className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>'''

new_html_end = '''              <Code className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
          )}
        </div>'''

content = content.replace(old_html_end, new_html_end)

with open('src/components/FormattedResponseCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

