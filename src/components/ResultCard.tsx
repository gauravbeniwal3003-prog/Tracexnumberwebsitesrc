/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, Home, Hash, MapPin, Building2, UserCircle2, Copy, Check, ShieldCheck, Share2, Car } from 'lucide-react';
import { useState } from 'react';
import { LookupResult } from '../services/api.ts';

interface ResultCardProps {
  data: LookupResult;
  index: number;
  key?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 }
};

export default function ResultCard({ data, index }: ResultCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const isTelegram = data.platform === "Telegram Lookup" || !!data.telegram_id;

  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === '0' || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = async () => {
    let shareText = '';
    if (isTelegram) {
      shareText = `
🔍 *TRACEXDATA - TELEGRAM INTEL*
--------------------------------
✈️ Telegram ID: ${data.telegram_id || 'N/A'}
📱 Registered Mobile: ${data.mobile || 'N/A'}

🌐 Website: tracexdata-api.onrender.com
📢 Telegram: t.me/Gaurav_beni_0001
--------------------------------
*Powered by TRACEXDATA Intelligence*
      `.trim();
    } else {
      shareText = `
🔍 *TRACEXDATA - VERIFIED RECORD*
--------------------------------
👤 Name: ${data.name || 'Unknown'}
👴 Father Name: ${data.father_name || 'N/A'}
📱 Mobile: ${data.mobile || 'N/A'}
📱 Alt No: ${data.alt_mobile || 'N/A'}
📧 Email: ${data.email || 'N/A'}
🆔 Aadhar: ${data.aadhar_number || 'N/A'}
🏢 SIM Co: ${data.state_circle || 'N/A'}
📍 State: ${data.operator || 'N/A'}
🏠 Address: ${data.address || 'N/A'}

🌐 Website: tracexdata-api.onrender.com
📢 Telegram: t.me/Gaurav_beni_0001
--------------------------------
*Powered by TRACEXDATA Intelligence*
      `.trim();
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Result for ${data.mobile || data.telegram_id || 'Record'}`,
          text: shareText,
        });
      } catch (err) {
        copyToClipboard(shareText, "Share Text");
      }
    } else {
      copyToClipboard(shareText, "Share Text");
    }
    
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 2000);
  };

  let fields: any[] = [];
  let title = data.name && data.name !== '0' ? data.name : "Unknown Person";
  let labelText = "Verified Record";

  const standardKeys = ['result_no', 'status', 'results', 'platform', 'id', 'address', 'raw_data'];
  const customEntries = Object.entries(data).filter(([k]) => !standardKeys.includes(k));
  const isCustomLookup = customEntries.some(([k]) => !['name', 'father_name', 'mobile', 'alt_mobile', 'email', 'aadhar_number', 'state_circle', 'operator'].includes(k));
  const itemData = data as any;

  if (isTelegram) {
    labelText = "Telegram Verification";
    title = `Telegram ID: ${data.telegram_id || 'N/A'}`;
    fields = [
      { label: "Telegram ID", value: data.telegram_id || 'N/A', icon: User, color: "text-blue-400" },
      { label: "Registered Mobile", value: data.mobile || 'N/A', icon: Phone, color: "text-emerald-400" }
    ];
  } else if (isCustomLookup) {
    labelText = "Premium Registry Match";
    title = data.name && data.name !== '0' && data.name !== 'N/A'
      ? data.name
      : (itemData.bank_name || itemData.bank || itemData.ifsc || itemData.family_id || data.aadhar_number || "REGISTRY ENTRY");

    fields = customEntries.map(([k, v]) => {
      const cleanKey = k
        .replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
        
      let icon = Hash;
      let color = "text-zinc-400";
      
      const lowerK = k.toLowerCase();
      if (lowerK.includes('name')) { icon = User; color = "text-blue-400"; }
      else if (lowerK.includes('mobile') || lowerK.includes('phone') || lowerK.includes('num')) { icon = Phone; color = "text-emerald-400"; }
      else if (lowerK.includes('aadhar') || lowerK.includes('card') || lowerK.includes('adhr') || lowerK.includes('uid') || lowerK.includes('pan') || lowerK.includes('pn')) { icon = ShieldCheck; color = "text-cyan-400"; }
      else if (lowerK.includes('bank') || lowerK.includes('ifsc') || lowerK.includes('branch') || lowerK.includes('acc')) { icon = Building2; color = "text-amber-400"; }
      else if (lowerK.includes('mail')) { icon = Mail; color = "text-rose-400"; }
      else if (lowerK.includes('city') || lowerK.includes('state') || lowerK.includes('circle') || lowerK.includes('dist') || lowerK.includes('pin')) { icon = MapPin; color = "text-purple-400"; }
      else if (lowerK.includes('chassis') || lowerK.includes('engine') || lowerK.includes('vehicle') || lowerK.includes('car') || lowerK.includes('fuel') || lowerK.includes('model') || lowerK.includes('insurance') || lowerK.includes('rto') || lowerK.includes('reg') || lowerK.includes('maker') || lowerK.includes('class')) { icon = Car; color = "text-indigo-400"; }
      
      return {
        label: cleanKey,
        value: String(v),
        icon,
        color
      };
    });
  } else {
    fields = [
      { label: "Name", value: data.name, icon: User, color: "text-blue-400" },
      { label: "Father's Name", value: data.father_name, icon: UserCircle2, color: "text-indigo-400" },
      { label: "Mobile Number", value: data.mobile, icon: Phone, color: "text-emerald-400" },
      { label: "Other Phone No.", value: data.alt_mobile, icon: Hash, color: "text-amber-400" },
      { label: "Email ID", value: data.email, icon: Mail, color: "text-rose-400" },
      { label: "Aadhar Card", value: data.aadhar_number, icon: ShieldCheck, color: "text-cyan-400" },
      { label: "SIM Company", value: data.state_circle, icon: Building2, color: "text-sky-400" },
      { label: "State / City", value: data.operator, icon: MapPin, color: "text-purple-400" },
    ];
  }

  const formatValue = (val: string) => {
    if (!val || val.toLowerCase() === 'na' || val.toLowerCase() === 'n/a' || val === '0') {
      return <span className="text-zinc-700 italic font-normal">No data available</span>;
    }
    return val;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="glass-card mb-6 md:mb-12 relative group/card border-white/5 hover:border-cyan-500/20 transition-all duration-700"
    >
      {/* Decorative Gradient Glows */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none group-hover/card:bg-cyan-500/10 transition-all duration-1000" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none group-hover/card:bg-purple-500/10 transition-all duration-1000" />

      {/* Header Section */}
      <div className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 border-b border-white/5 relative z-10 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5 md:mb-1">
              <span className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase text-cyan-500 text-nowrap">{labelText}</span>
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
            </div>
            <h2 className="text-lg md:text-3xl font-bold tracking-tight text-white capitalize break-words">
              {title}
            </h2>
          </div>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3">
          <button 
            onClick={handleShare}
            className="px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest"
          >
            {isSharing ? <Check size={10} className="md:w-3 text-green-400" /> : <Share2 size={10} className="md:w-3" />}
            {isSharing ? 'Copied' : 'Share'}
          </button>
          <div className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] md:text-[10px] font-bold tracking-tighter uppercase whitespace-nowrap">
            VIP ACCESS
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="p-4 md:p-8 relative z-10">
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className={`grid gap-2.5 md:gap-6 ${isTelegram ? "grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto" : "grid-cols-2 lg:grid-cols-4"}`}
        >
          {fields.map((field, idx) => (
            <motion.div 
              key={idx} 
              variants={item}
              onClick={() => copyToClipboard(field.value, field.label)}
              className="relative p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/2 border border-white/[0.04] hover:bg-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer group/item overflow-hidden"
            >
              {/* Active Indicator Pin */}
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {copiedField === field.label ? (
                  <div className="bg-green-500/20 text-green-400 p-0.5 rounded-md">
                    <Check size={10} />
                  </div>
                ) : (
                  <div className="bg-white/5 text-zinc-500 p-0.5 rounded-md">
                    <Copy size={10} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-1.5 md:mb-2">
                <field.icon size={11} className={`${field.color} opacity-80 md:w-3.5 md:h-3.5`} />
                <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-zinc-600 md:text-zinc-500 truncate">{field.label}</span>
              </div>
              <div className="text-[11px] md:text-sm font-mono font-medium text-zinc-200 overflow-hidden text-ellipsis break-words line-clamp-1 group-hover/item:line-clamp-none transition-all">
                {formatValue(field.value)}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Address Banner */}
        {data.address && data.address !== '0' && data.address.toLowerCase() !== 'n/a' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            onClick={() => copyToClipboard(data.address, "Address")}
            className="mt-4 md:mt-6 p-4 md:p-6 rounded-xl md:rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] hover:border-purple-500/30 transition-all duration-500 cursor-pointer group/item relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-0 group-hover/item:opacity-5 transition-opacity">
              <MapPin size={40} className="md:w-20 md:h-20 text-purple-500" />
            </div>
            
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 md:p-2 rounded-lg bg-white/5 border border-white/10">
                  <MapPin size={12} className="md:w-4 md:h-4 text-purple-400" />
                </div>
                <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-zinc-500">Home Address</span>
              </div>
              {copiedField === "Address" ? (
                <span className="text-[9px] md:text-[10px] font-bold text-green-400 uppercase flex items-center gap-1">
                  <Check size={10} className="md:w-3" /> Copied
                </span>
              ) : (
                <Copy size={12} className="text-zinc-600 opacity-0 group-hover/item:opacity-100 transition-all md:w-3.5" />
              )}
            </div>
            
            <p className="text-[11px] md:text-base text-zinc-300 leading-relaxed font-mono tracking-tight">
              {formatValue(data.address)}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

