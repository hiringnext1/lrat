import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, Users, CheckCircle2, MessageSquare, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      {/* Background Decor - HeyReach style purple glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-violet-50 rounded-full blur-[100px] opacity-40" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-widest mb-10 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>The #1 LinkedIn Automation for Agencies</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-[1000] text-slate-900 tracking-tighter leading-[0.9] mb-10"
          >
            Scale your LinkedIn outbound <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              without getting banned.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-slate-500 mb-14 leading-relaxed max-w-2xl mx-auto font-medium"
          >
            Rotate between 10+ accounts, automate hyper-personalized Claude AI icebreakers, and manage everything from a unified inbox.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-24"
          >
            <Link 
              to="/dashboard" 
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-6 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all shadow-[0_20px_50px_-10px_rgba(79,70,229,0.4)] flex items-center justify-center gap-3 active:scale-95"
            >
              Start Free Trial <ArrowRight size={20} strokeWidth={3} />
            </Link>
            <button className="w-full sm:w-auto px-12 py-6 rounded-[24px] text-lg font-black text-slate-900 hover:bg-slate-50 transition-all border border-slate-100 flex items-center justify-center gap-3 uppercase tracking-widest">
              Book a Demo
            </button>
          </motion.div>

          {/* Social Proof Strip */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="border-t border-slate-100 pt-12 pb-32"
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Trusted by 6,000+ Growth Teams</p>
            <div className="flex flex-wrap justify-center gap-12 lg:gap-24 opacity-30 grayscale contrast-125">
               <span className="text-2xl font-black tracking-tighter italic">Growthify</span>
               <span className="text-2xl font-black tracking-tighter italic">Acme.co</span>
               <span className="text-2xl font-black tracking-tighter italic">ScaleForce</span>
               <span className="text-2xl font-black tracking-tighter italic">LeadGen</span>
            </div>
          </motion.div>
        </div>

        {/* HeyReach Style Overlapping UI Cards Mockup */}
        <div className="relative max-w-6xl mx-auto h-[600px] mt-10">
          
          {/* Central Main Chart Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 top-0 w-[90%] md:w-[800px] bg-white border border-slate-100 rounded-[40px] shadow-2xl p-10 z-20"
          >
             <div className="flex justify-between items-center mb-10">
                <div className="space-y-1 text-left">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Revenue Forecast</p>
                  <h4 className="text-3xl font-[1000] text-slate-900">$24,400.00</h4>
                </div>
                <div className="flex gap-2">
                   {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100" />)}
                </div>
             </div>
             <div className="flex items-end gap-3 h-48">
                {[30, 60, 40, 80, 50, 90, 70, 45, 85, 65, 95, 50].map((h, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.5 + (i * 0.05) }}
                    className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl" 
                  />
                ))}
             </div>
          </motion.div>

          {/* Overlapping Reply Rate Card */}
          <motion.div 
            initial={{ opacity: 0, x: -100 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute left-[-20px] md:left-[50px] top-[220px] bg-indigo-600 text-white p-8 rounded-[32px] shadow-2xl z-30 w-[240px]"
          >
             <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6" fill="currentColor" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Avg. Reply Rate</p>
             <h4 className="text-5xl font-[1000] tracking-tighter">42.8%</h4>
             <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                <Target size={14} /> +12.4% this week
             </div>
          </motion.div>

          {/* Overlapping Unified Inbox Card */}
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="absolute right-[-20px] md:right-[50px] top-[180px] bg-white border border-slate-100 p-8 rounded-[32px] shadow-2xl z-10 w-[300px] hidden md:block"
          >
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Users size={24} /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Senders</p>
                   <p className="text-sm font-black text-slate-900 uppercase tracking-tight">12 Accounts Linked</p>
                </div>
             </div>
             <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-100" />
                     <div className="flex-1 h-2 bg-slate-50 rounded-full" />
                     <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  </div>
                ))}
             </div>
          </motion.div>

          {/* Floating Anti-Ban Badge */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 z-40"
          >
             <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <ShieldCheck size={18} />
             </div>
             <span className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">100% Anti-Ban Protection</span>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
