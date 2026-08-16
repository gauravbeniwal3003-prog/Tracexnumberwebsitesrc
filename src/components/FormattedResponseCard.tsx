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
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FormattedResponseCardProps {
  data: any;
  serviceType?: string;
  title?: string;
  onReset?: () => void;
}

const BANNED_KEYS = [
  'api_buy_link', 'website_link', 'buy_api', 'tg_channel', 'tg_owner'
];

function isBannedKey(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase().replace(/[\s\-_]/g, '');
  return BANNED_KEYS.some(banned => k === banned || k.includes(banned));
}

function cleanJsonPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return cleanJsonPayload(JSON.parse(trimmed));
      } catch {
        return obj;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanJsonPayload);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (isBannedKey(k)) continue;
      out[k] = cleanJsonPayload(v);
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
          return data; // Return the raw text directly if parse fails
        }
      } else {
        return data; // Not JSON string, return plain text directly
      }
    }
    const cleaned = cleanJsonPayload(payload);
    if (typeof cleaned === 'string') {
      return cleaned;
    }
    return JSON.stringify(cleaned, null, 2);
  } catch (err) {
    return typeof data === 'string' ? data : JSON.stringify(data || {}, null, 2);
  }
}

export default function FormattedResponseCard({ data, serviceType, onReset }: FormattedResponseCardProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const navigate = useNavigate();
  const cleanJsonStr = getCleanJsonString(data);

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(cleanJsonStr);
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
    <div className="w-full max-w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 sm:p-6 space-y-4 my-4 font-sans text-slate-100 overflow-hidden">
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Response Received</span>
          </div>
          {serviceType && (
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {serviceType}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Copy Raw JSON"
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

          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Download JSON File"
          >
            <ArrowDownToLine className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            title="Print Output"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pretty-Printed JSON Code View */}
      <div className="relative w-full max-w-full overflow-hidden">
        <pre className="w-full text-left font-mono text-xs sm:text-sm text-emerald-400 bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/90 overflow-x-auto whitespace-pre-wrap break-all sm:break-words leading-relaxed max-h-[500px] overflow-y-auto select-all shadow-inner">
          {cleanJsonStr}
        </pre>
      </div>

      {/* Professional Bottom Return to Dashboard Navigation */}
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
