/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

export default function Skeleton({ message }: { message?: string }) {
  return (
    <div className="space-y-4">
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-4 mb-2"
        >
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-cyan-400 font-mono text-xs uppercase tracking-widest animate-pulse">{message}</p>
        </motion.div>
      )}
      {[1, 2].map((i) => (
        <div key={i} className="glass-card p-6 w-full animate-pulse">
          <div className="h-6 bg-white/10 rounded-lg w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="h-10 bg-white/5 rounded-xl"></div>
            ))}
          </div>
          <div className="mt-4 h-20 bg-white/5 rounded-xl w-full"></div>
        </div>
      ))}
    </div>
  );
}
