import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiquidBackground from '../components/LiquidBackground';

export default function Terms() {
  return (
    <div className="relative min-h-screen bg-white text-slate-800 selection:bg-sky-500/20 selection:text-sky-900">
      <LiquidBackground />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-slate-600 hover:text-sky-600 transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-extrabold uppercase tracking-widest">Back to Home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 rounded-[32px] border border-sky-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-sky-100 border border-sky-200 text-sky-600">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Terms & Conditions</h1>
          </div>

          <div className="space-y-6 text-slate-600 leading-relaxed font-medium">
            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">1. Ethical Use Policy</h2>
              <p>
                TRACEXDATA Intelligence Engine is designed strictly for ethical use, research, and data verification purposes. We do not promote, encourage, or facilitate any illegal activity, stalking, harassment, or unauthorized access to private information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">2. User Responsibility</h2>
              <p>
                By using this service, you agree to comply with all applicable local, state, and international laws. Users are solely responsible for how they utilize the data provided. Any misuse of the platform for illegal purposes will result in an immediate and permanent ban without notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">3. Data Source</h2>
              <p>
                The information provided is aggregated from publicly available datasets and premium intelligence feeds. While we strive for accuracy, TRACEXDATA does not guarantee the 100% precision of the results as they depend on third-party sources.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">4. Limitations of Liability</h2>
              <p>
                TRACEXDATA and its developers shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service or the information provided therein.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-900 mb-3">5. Service Modifications</h2>
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
