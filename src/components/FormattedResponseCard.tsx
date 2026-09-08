import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowDownToLine, 
  RotateCcw,
  ArrowLeft,
  Terminal,
  FileJson
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FormattedResponseCardProps {
  data: any;
  serviceType?: string;
  title?: string;
  onReset?: () => void;
}

const BANNED_KEYS = [
  'api_buy_link', 'website_link', 'buy_api', 'tg_channel', 'tg_owner', 'credit', 'credits'
];

function isBannedKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const k = key.toLowerCase().replace(/[\s\-_]/g, '');
  return BANNED_KEYS.some(banned => k === banned || k.includes(banned));
}

// Client-side cleanup of branding
function clientScrub(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '';
    }
  }
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
  if (obj === null || obj === undefined) return null;
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
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .map(cleanJsonPayload)
      .filter(x => x !== null && x !== undefined && x !== '');
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (isBannedKey(k)) continue;
      const cleanedVal = cleanJsonPayload(v);
      if (cleanedVal !== null && cleanedVal !== undefined && cleanedVal !== '') {
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
    if (cleaned === null || cleaned === undefined) return '{}';
    if (typeof cleaned === 'string') {
      return cleaned;
    }
    return JSON.stringify(cleaned, null, 2);
  } catch {
    return typeof data === 'string' ? clientScrub(data) : JSON.stringify(data || {}, null, 2);
  }
}

export default function FormattedResponseCard({ data, serviceType, onReset }: FormattedResponseCardProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const navigate = useNavigate();

  const cleanJsonStr = getCleanJsonString(data);

  const handleCopyJson = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanJsonStr);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanJsonStr;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([cleanJsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `response_${serviceType || 'data'}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download JSON:', err);
    }
  };

  return (
    <div className="w-full max-w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] p-4 sm:p-6 space-y-4 font-sans text-slate-100 overflow-hidden">
      
      {/* Top Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Response Received</span>
          </div>
          {serviceType && (
            <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {serviceType === 'phone' ? 'Number Lookup' : serviceType === 'telegram' ? 'Telegram OSINT' : serviceType === 'ifsc' || serviceType === 'bnk' ? 'Bank IFSC' : serviceType}
            </span>
          )}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
            <FileJson className="w-3 h-3" />
            JSON Output
          </span>
        </div>

        {/* Copy Button Quick Action Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              copiedJson 
                ? 'bg-emerald-500 text-slate-950 scale-105' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
          >
            {copiedJson ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Download JSON file"
          >
            <ArrowDownToLine className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* JSON Code Display Window */}
      <div className="relative w-full max-w-full rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>data.json</span>
          </div>
          <span className="text-[10px] text-slate-500">Click Copy JSON or select all to copy</span>
        </div>
        
        <pre className="w-full text-left font-mono text-xs sm:text-[13px] text-emerald-400 p-4 sm:p-5 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-[520px] overflow-y-auto select-all">
          {cleanJsonStr}
        </pre>
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (onReset) onReset();
            navigate('/dashboard');
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopyJson}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
          >
            {copiedJson ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Search</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
