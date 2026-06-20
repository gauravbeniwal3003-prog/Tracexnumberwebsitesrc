import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function Terms() {
  return (
    <div className="relative min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
      <LiquidBackground />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-mono uppercase tracking-widest">Back to Lookup</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Terms & Conditions</h1>
          </div>

          <div className="prose prose-invert max-w-none space-y-6 text-zinc-400 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-3">1. Ethical Use Policy</h2>
              <p>
                TRACEXDATA Intelligence Engine is designed strictly for ethical use, research, and data verification purposes. We do not promote, encourage, or facilitate any illegal activity, stalking, harassment, or unauthorized access to private information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-3">2. User Responsibility</h2>
              <p>
                By using this service, you agree to comply with all applicable local, state, and international laws. Users are solely responsible for how they utilize the data provided. Any misuse of the platform for illegal purposes will result in an immediate and permanent ban without notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-3">3. Data Source</h2>
              <p>
                The information provided is aggregated from publicly available datasets and premium intelligence feeds. While we strive for accuracy, TRACEXDATA does not guarantee the 100% precision of the results as they depend on third-party sources.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-3">4. Limitations of Liability</h2>
              <p>
                TRACEXDATA and its developers shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service or the information provided therein.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-200 mb-3">5. Service Modifications</h2>
              <p>
                We reserve the right to modify or discontinue the service at any time without prior notice. Terms are subject to change to reflect updates in legal requirements or platform functionality.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
