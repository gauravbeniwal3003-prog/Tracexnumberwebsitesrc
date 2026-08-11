import React, { useState } from 'react';
import { CheckCircle2, Printer, Copy, Check, Code, LayoutList } from 'lucide-react';

interface FormattedResponseCardProps {
  data: any;
  serviceType?: string;
  title?: string;
  onReset?: () => void;
}

const BANNED_KEYS = [
  'developer', 'owner', 'buy_api', 'provider', 'credits', 'telegram', 'site', 
  'website', 'api_buy_link', 'website_link', 'support', 'contact', 'bought_from',
  'vendor', 'bot_owner', 'channel', 'dev', 'admin', 'bot', 'seller', 'paid_by', 
  'copyright', 'created_by', 'tg_channel', 'tg_owner'
];

function isBannedKey(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase().replace(/[\s\-_]/g, '');
  return BANNED_KEYS.some(banned => k === banned || k.includes(banned));
}

function isBannedValue(val: any): boolean {
  if (typeof val !== 'string') return false;
  const v = val.toLowerCase();
  return (
    v.includes('techvishal') ||
    v.includes('vishalboss') ||
    v.includes('cyb3r') ||
    v.includes('s0ldier') ||
    v.includes('anish') ||
    v.includes('exploits') ||
    (v.includes('@') && (v.includes('boss') || v.includes('tech') || v.includes('dev') || v.includes('soldier') || v.includes('admin')))
  );
}

function formatKeyLabel(key: string): string {
  if (!key) return '';
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase();
}

export function isNumberLookupService(serviceType?: string, data?: any): boolean {
  if (serviceType) {
    const s = serviceType.toLowerCase().trim();
    if (
      s === 'phone' ||
      s === 'number' ||
      s === 'number_lookup' ||
      s === 'mobile' ||
      s === 'call_history' ||
      s === 'telegram' ||
      s === 'truecaller' ||
      s.includes('phone') ||
      s.includes('number') ||
      s.includes('mobile')
    ) {
      return true;
    }
  }

  // Fallback check on data structure if no serviceType explicitly passed
  if (data && typeof data === 'object') {
    const keys = Object.keys(data).map(k => k.toLowerCase());
    if (keys.includes('phone') || keys.includes('mobile_number') || keys.includes('carrier') || keys.includes('telecom')) {
      return true;
    }
  }

  return false;
}

export function extractDisplayEntries(obj: any): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  if (obj === null || obj === undefined) return entries;
  
  try {
    let targetObj = obj;

    // Handle JSON string inputs
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          targetObj = JSON.parse(trimmed);
        } catch {
          if (!isBannedValue(trimmed)) {
            entries.push(['RESPONSE', trimmed]);
          }
          return entries;
        }
      } else {
        if (!isBannedValue(trimmed)) {
          entries.push(['RESPONSE', trimmed]);
        }
        return entries;
      }
    }

    // Recursively unwrap common response wrappers
    const unwrapKeys = ['results', 'data', 'response', 'result', 'records', 'payload', 'info', 'user', 'item', 'details'];
    let depth = 0;
    while (targetObj && typeof targetObj === 'object' && !Array.isArray(targetObj) && depth < 3) {
      let unwrapped = false;
      for (const k of unwrapKeys) {
        if (targetObj[k] && typeof targetObj[k] === 'object' && Object.keys(targetObj[k]).length > 0) {
          const otherKeys = Object.keys(targetObj).filter(key => key !== k && key !== 'status' && key !== 'success' && key !== 'message' && key !== 'code' && key !== 'response_code');
          if (otherKeys.length === 0 || k === 'results' || k === 'data') {
            targetObj = targetObj[k];
            unwrapped = true;
            break;
          }
        }
      }
      if (!unwrapped) break;
      depth++;
    }

    function processKeyValue(key: string, value: any, prefix = '') {
      try {
        if (value === null || value === undefined || value === '') return;
        const fullKey = prefix ? `${prefix}_${key}` : key;
        
        if (isBannedKey(key) || isBannedKey(fullKey)) return;
        
        if (typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (item !== null && item !== undefined) {
                if (typeof item === 'object') {
                  processKeyValue(`item_${index + 1}`, item, fullKey);
                } else {
                  processKeyValue(`${index + 1}`, item, fullKey);
                }
              }
            });
          } else {
            Object.entries(value).forEach(([childK, childV]) => {
              processKeyValue(childK, childV, fullKey);
            });
          }
        } else {
          const valStr = String(value).trim();
          if (isBannedValue(valStr)) return;
          entries.push([fullKey, valStr]);
        }
      } catch (err) {
        console.error('Error processing key-value in FormattedResponseCard:', err);
      }
    }

    if (Array.isArray(targetObj)) {
      targetObj.forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          Object.entries(item).forEach(([k, v]) => {
            processKeyValue(k, v, `record_${idx + 1}`);
          });
        } else if (item !== null && item !== undefined) {
          processKeyValue(`record_${idx + 1}`, item);
        }
      });
    } else if (typeof targetObj === 'object' && targetObj !== null) {
      Object.entries(targetObj).forEach(([k, v]) => {
        processKeyValue(k, v);
      });
    } else {
      const strVal = String(targetObj).trim();
      if (!isBannedValue(strVal)) {
        entries.push(['RESULT', strVal]);
      }
    }
  } catch (e) {
    console.error('Error extracting display entries:', e);
  }

  return entries;
}

export function getCleanJsonData(obj: any): string {
  if (!obj) return '{}';
  try {
    let target = obj;
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          target = JSON.parse(trimmed);
        } catch {
          return JSON.stringify({ response: trimmed }, null, 2);
        }
      } else {
        return JSON.stringify({ response: trimmed }, null, 2);
      }
    }

    function filterObject(item: any): any {
      if (item === null || item === undefined) return undefined;
      if (typeof item !== 'object') {
        if (isBannedValue(item)) return undefined;
        return item;
      }
      if (Array.isArray(item)) {
        const cleanedArr = item.map(filterObject).filter(v => v !== undefined);
        return cleanedArr.length > 0 ? cleanedArr : undefined;
      }
      const cleanObj: Record<string, any> = {};
      Object.entries(item).forEach(([k, v]) => {
        if (!isBannedKey(k)) {
          const cleanedVal = filterObject(v);
          if (cleanedVal !== undefined) {
            cleanObj[k] = cleanedVal;
          }
        }
      });
      return Object.keys(cleanObj).length > 0 ? cleanObj : undefined;
    }

    const cleanedData = filterObject(target);
    return JSON.stringify(cleanedData || {}, null, 2);
  } catch (e) {
    console.error('Error producing clean JSON data:', e);
    return '{}';
  }
}

export default function FormattedResponseCard({ data, serviceType }: FormattedResponseCardProps) {
  const isNumber = isNumberLookupService(serviceType, data);
  // Number lookup defaults to formatted view, all others default to pretty JSON
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>(isNumber ? 'formatted' : 'json');
  const [copiedJson, setCopiedJson] = useState(false);

  const entries = extractDisplayEntries(data);
  const cleanJsonStr = getCleanJsonData(data);

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(cleanJsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
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
    <div className="w-full bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl md:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 p-4 sm:p-6 space-y-4 my-4 font-sans text-slate-800">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-200 text-emerald-800 font-black text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-600/20 shrink-0" />
            <span>Success</span>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('formatted')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'formatted'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'json'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Copy response as JSON"
          >
            {copiedJson ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied JSON</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Print record"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'json' ? (
        /* Pretty-Printed JSON Code View (Mobile Screen Compatible, High Readability) */
        <div className="relative group">
          <pre className="text-left font-mono text-xs sm:text-sm text-emerald-400 bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 overflow-x-auto whitespace-pre-wrap break-all sm:break-all sm:break-words leading-relaxed max-h-[500px] overflow-y-auto select-all shadow-inner">
            {cleanJsonStr}
          </pre>
        </div>
      ) : (
        /* Formatted Key-Value Field Card List */
        <div className="divide-y divide-slate-100">
          {entries.length > 0 ? (
            entries.map(([k, v], idx) => (
              <div key={idx} className="py-3 first:pt-1 last:pb-1 flex flex-col gap-0.5 text-left">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {formatKeyLabel(k)}
                </span>
                <span className="text-sm sm:text-base font-black text-slate-900 font-mono break-all sm:break-words leading-snug">
                  {v}
                </span>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 font-medium italic">
              No displayable data fields found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
