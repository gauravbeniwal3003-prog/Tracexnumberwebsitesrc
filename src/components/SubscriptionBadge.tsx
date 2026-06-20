/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Timer, Infinity as InfinityIcon } from 'lucide-react';

export default function SubscriptionBadge({ expiry }: { expiry: string | null }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiry) return;

    const calculateTime = () => {
      const now = Date.now();
      const end = new Date(expiry).getTime();
      const diff = Math.max(0, end - now);
      setTimeLeft(diff);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  if (!expiry || timeLeft <= 0) return null;

  const seconds = Math.floor((timeLeft / 1000) % 60);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)));

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] md:text-xs">
      <Timer size={14} className="animate-pulse" />
      <div className="flex items-center gap-1">
        {hours > 0 && <span>{hours}h</span>}
        <span>{minutes}m</span>
        <span className="w-4">{seconds}s</span>
      </div>
      <InfinityIcon size={12} className="ml-1 opacity-50" />
    </div>
  );
}
