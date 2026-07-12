import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Fingerprint, RefreshCcw, Eye, ShieldAlert } from 'lucide-react';

const SECURITY_CARDS = [
  { title: "Proxy Protection", desc: "Each account gets its own dedicated residential IP.", icon: Fingerprint },
  { title: "Smart Throttling", desc: "Randomized delays that mimic human typing and browsing.", icon: RefreshCcw },
  { title: "Behavioral Spikes", desc: "Simulated profile views and likes before sending requests.", icon: Eye },
  { title: "Limit Watcher", desc: "Real-time monitoring of LinkedIn's weekly invitation limits.", icon: ShieldAlert }
];

export default function Safety() {
  return (
    <section id="safety" className="py-40 bg-slate-900 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto mb-24">
          <h2 className="text-indigo-400 font-black uppercase text-[11px] tracking-[0.4em] mb-6">Infrastructure</h2>
          <h3 className="text-4xl md:text-6xl font-[1000] text-white tracking-tighter leading-tight mb-8">
            Safety isn't a feature. <br />
            <span className="text-indigo-400">It's the foundation.</span>
          </h3>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            We’ve built PipelineX with a safety-first architecture to ensure your LinkedIn reputation remains spotless while you scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SECURITY_CARDS.map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl text-left group hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-8 shadow-lg shadow-indigo-500/20">
                <card.icon size={24} />
              </div>
              <h4 className="text-xl font-[1000] text-white mb-4 tracking-tight">{card.title}</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-32 p-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 w-full h-px" />
        
        <div className="mt-20 flex flex-wrap justify-center items-center gap-12 opacity-50">
           <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest"><ShieldCheck size={20} className="text-indigo-400" /> GDPR Compliant</div>
           <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest"><Lock size={20} className="text-indigo-400" /> AES-256 Encryption</div>
           <div className="flex items-center gap-3 text-white font-black text-sm uppercase tracking-widest"><ShieldCheck size={20} className="text-indigo-400" /> SOC2 Type II</div>
        </div>
      </div>
    </section>
  );
}
