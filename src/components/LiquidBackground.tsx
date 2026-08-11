/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { motion } from 'motion/react';

export default function LiquidBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-slate-50/40">
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, 100, 0],
          y: [0, -60, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-sky-300/30 blur-[130px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, -120, 0],
          y: [0, 80, 0],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-blue-300/25 blur-[140px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.35, 1],
          x: [90, -90, 90],
          y: [-90, 90, -90],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-[20%] right-[10%] w-[45%] h-[45%] rounded-full bg-cyan-300/25 blur-[120px]"
      />
    </div>
  );
}
