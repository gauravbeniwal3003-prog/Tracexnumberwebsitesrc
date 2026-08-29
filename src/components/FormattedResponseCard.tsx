import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  ArrowDownToLine, 
  RotateCcw,
  ArrowLeft,
  Terminal,
  ShieldAlert,
  User,
  Smartphone,
  MapPin,
  Mail,
  Radio,
  Send,
  Info,
  Hash,
  Calendar,
  Globe,
  Database,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FormattedResponseCardProps {
  data: any;
  serviceType?: string;
  title?: string;
  onReset?: () => void;
}

const BANNED_KEYS = [
  'api_buy_link', 'website_link', 'buy_api', 'tg_channel', 'tg_owner', 'status', 'success', 'found'
];

function isBannedKey(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase().replace(/[\s\-_]/g, '');
  return BANNED_KEYS.some(banned => k === banned || k.includes(banned));
}

// Client-side cleanup of branding
function clientScrub(val: any): string {
  if (val === null || val === undefined) return '';
  const text = String(val);
  return text
    .replace(/(while\s+result\s*(?:-\s*)?(?:https?:\/\/(?:www\.)?)?digisevapoint\.com)/gi, "")
    .replace(/while\s+result\s*(?:-\s*)?/gi, "")
    .replace(/(digi[\s\-_]*seva(?:point)?(?:\.in|\.com)?|@?digiseva(?:point)?|tech[\s\-_]*vishal(?:[\s\-_]*boss)?|techvishalboss(?:\.com)?|vishal[\s\-_]*boss(?:\s*👑)?|osint[\s\-_]*caller(?:bot)?|@?osintcaller(?:bot)?|u(?:ers|ser)xinfo(?:\.in)?|@?u(?:ers|ser)xinfo|anish[\s\-_]*exploits|exploitsindia(?:\.site)?|cyb(?:er|3r)[\s\-_]*s(?:oldier|0ldier)|@?cyb(?:er|3r)s(?:oldier|0ldier)|@?userxinfo|@?vectraen|vectraen|asurpapa|@?asurpapa|asur_about|powered by asur|asur|👑|\ud83d\udc51)/gi, "")
    .replace(/(by\s+api|developer|developer_name|provider_name|provider_info|buy_api|website_link|api_buy_link|owner_telegram|contact|support|powered_by|powered\s+by|credits_to|credit)/gi, "")
    .replace(/(💳\s*BUY\s*API\s*:\s*@?\w+|🆘\s*SUPPORT\s*:\s*@?\w+)/gi, "")
    .replace(/(t\.me\/\w+|https?:\/\/(?:www\.)?\w+\.\w+(?:\/\S*)?)/gi, "")
    .replace(/[━─═║╔╗╚╝├┤┬┴┼]{3,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanJsonPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return cleanJsonPayload(JSON.parse(trimmed));
      } catch {
        return clientScrub(obj);
      }
    }
    return clientScrub(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanJsonPayload).filter(x => x !== null && x !== '');
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (isBannedKey(k)) continue;
      const cleanedVal = cleanJsonPayload(v);
      if (cleanedVal !== null && cleanedVal !== '') {
        out[k] = cleanedVal;
      }
    }
    return out;
  }
  return obj;
}

export function getCleanJsonString(data: any): string {
  if (data === null || data === undefined) return '{}';
  try {
    let payload = data;
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          payload = JSON.parse(trimmed);
        } catch {
          return clientScrub(data);
        }
      } else {
        return clientScrub(data);
      }
    }
    const cleaned = cleanJsonPayload(payload);
    if (typeof cleaned === 'string') {
      return cleaned;
    }
    return JSON.stringify(cleaned, null, 2);
  } catch (err) {
    return typeof data === 'string' ? clientScrub(data) : JSON.stringify(data || {}, null, 2);
  }
}

interface ParsedField {
  key: string;
  label: string;
  value: string;
  icon: React.ReactNode;
}

// Intelligent field labels and icons mapping
function getFieldConfig(key: string, valueStr: string): { label: string; icon: React.ReactNode } {
  const k = key.toLowerCase().replace(/[\s\-_]/g, '');
  
  if (k.includes('phone') || k.includes('mobile') || k.includes('number') || k.includes('contact')) {
    return { label: 'Phone Number', icon: <Smartphone className="text-cyan-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('fullname') || k === 'name' || k.includes('owner') || k === 'username' && !k.includes('tg') && !k.includes('telegram')) {
    return { label: 'Full Name', icon: <User className="text-blue-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('carrier') || k.includes('operator') || k.includes('sim') || k.includes('telecom') || k === 'network') {
    return { label: 'Network Operator', icon: <Radio className="text-emerald-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('circle') || k.includes('state') || k.includes('location') || k.includes('city') || k.includes('address') || k.includes('region')) {
    return { label: 'State / Location', icon: <MapPin className="text-amber-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('tg') || k.includes('telegram') || k === 'username' || k === 'username_or_id' || k === 'handle') {
    return { label: 'Telegram Handle', icon: <Send className="text-sky-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('chatid') || k.includes('tgid') || k === 'id' || k === 'user_id') {
    return { label: 'Telegram ID', icon: <Hash className="text-violet-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('email') || k.includes('mail')) {
    return { label: 'Email Address', icon: <Mail className="text-indigo-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('date') || k.includes('time') || k.includes('expiry') || k.includes('created')) {
    return { label: 'Timestamp', icon: <Calendar className="text-rose-400 w-4 h-4 shrink-0" /> };
  }
  if (k.includes('country') || k.includes('ip') || k.includes('host')) {
    return { label: 'Origin', icon: <Globe className="text-teal-400 w-4 h-4 shrink-0" /> };
  }

  // Fallback humanized key label
  const humanized = key
    .split(/[\s\-_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  return { label: humanized, icon: <Database className="text-slate-400 w-4 h-4 shrink-0" /> };
}

export default function FormattedResponseCard({ data, serviceType, onReset }: FormattedResponseCardProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [copiedJson, setCopiedJson] = useState(false);
  const navigate = useNavigate();

  const cleanJsonStr = getCleanJsonString(data);

  // Parse the object into beautiful structured fields
  const getParsedFields = (): ParsedField[] => {
    let parsedObj: any = null;
    try {
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          parsedObj = JSON.parse(trimmed);
        }
      } else {
        parsedObj = data;
      }
    } catch {
      // JSON parse failed, treat as string
    }

    const fields: ParsedField[] = [];

    // Helper to add clean field
    const addField = (k: string, val: any) => {
      if (val === null || val === undefined) return;
      if (isBannedKey(k)) return;
      const valClean = clientScrub(val);
      if (!valClean) return;

      const { label, icon } = getFieldConfig(k, valClean);
      fields.push({
        key: k,
        label,
        value: valClean,
        icon
      });
    };

    if (parsedObj && typeof parsedObj === 'object') {
      const cleaned = cleanJsonPayload(parsedObj);
      if (Array.isArray(cleaned)) {
        // Flatten array of objects
        cleaned.forEach((item, index) => {
          if (typeof item === 'object') {
            Object.entries(item).forEach(([k, v]) => {
              addField(`${k}_${index + 1}`, v);
            });
          } else {
            addField(`Record_${index + 1}`, item);
          }
        });
      } else {
        Object.entries(cleaned).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            Object.entries(v).forEach(([subK, subV]) => {
              addField(`${k} - ${subK}`, subV);
            });
          } else {
            addField(k, v);
          }
        });
      }
    } else {
      // Raw non-JSON multi-line text
      const rawText = clientScrub(typeof data === 'string' ? data : JSON.stringify(data));
      const lines = rawText.split('\n');
      let index = 1;
      lines.forEach(line => {
        const cleanedLine = line.trim();
        if (!cleanedLine) return;

        if (cleanedLine.includes(':')) {
          const colonIdx = cleanedLine.indexOf(':');
          const k = cleanedLine.substring(0, colonIdx).trim();
          const v = cleanedLine.substring(colonIdx + 1).trim();
          if (k && v) {
            addField(k, v);
          }
        } else {
          addField(`Record Info ${index++}`, cleanedLine);
        }
      });
    }

    return fields;
  };

  const parsedFields = getParsedFields();

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(cleanJsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([cleanJsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracex_response_${serviceType || 'data'}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download JSON:', err);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Failed to print:', err);
    }
  };

  return (
    <div className="w-full max-w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 sm:p-6 space-y-5 my-4 font-sans text-slate-100 overflow-hidden">
      
      {/* Top Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Record Found</span>
          </div>
          {serviceType && (
            <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {serviceType === 'phone' ? 'Number Lookup' : serviceType === 'telegram' ? 'Telegram OSINT' : serviceType}
            </span>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'visual'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            📊 Formatted Card
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'json'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            💻 Developer JSON
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'visual' ? (
        <div className="space-y-4">
          
          {/* Formatted Fields Grid */}
          {parsedFields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedFields.map((field, idx) => (
                <div 
                  key={`${field.key}-${idx}`} 
                  className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex items-start gap-3.5 hover:border-emerald-500/30 transition-all shadow-sm"
                >
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {field.icon}
                  </div>
                  <div className="space-y-1 overflow-hidden min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                      {field.label}
                    </span>
                    <span className="text-sm font-bold text-slate-100 block break-all font-mono">
                      {field.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
              <Cpu className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
              <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
                No individual metadata fields could be extracted. Please switch to the **Developer JSON** tab to view the complete raw response.
              </p>
            </div>
          )}

          {/* Verification Badge */}
          <div className="p-3 px-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 font-medium flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Cryptographically signed by TRACEXDATA decentralized registry.</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">SECURE RECORD</span>
          </div>

        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Bar for Developer JSON */}
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-white" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 text-slate-300" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold transition-all shadow-xs cursor-pointer"
              title="Print Output"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pretty-Printed JSON Code View */}
          <div className="relative w-full max-w-full overflow-hidden">
            <pre className="w-full text-left font-mono text-xs text-emerald-400 bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/90 overflow-x-auto whitespace-pre-wrap break-all sm:break-words leading-relaxed max-h-[400px] overflow-y-auto select-all shadow-inner">
              {cleanJsonStr}
            </pre>
          </div>
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (onReset) onReset();
            navigate('/dashboard');
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Return to Dashboard</span>
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Search Another Record</span>
          </button>
        )}
      </div>
    </div>
  );
}
