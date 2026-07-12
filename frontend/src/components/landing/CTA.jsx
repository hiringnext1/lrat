import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CTA() {
  return (
    <section className="py-40 bg-white">
      <div className="container mx-auto px-6 text-center">
        <div className="bg-indigo-600 rounded-[64px] p-12 lg:p-32 relative overflow-hidden group shadow-[0_48px_100px_-12px_rgba(79,70,229,0.5)]">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#ffffff,transparent_60%)]" />
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
               className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.1),transparent)]" 
             />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
             <div className="w-20 h-20 rounded-[32px] bg-white text-indigo-600 flex items-center justify-center mb-12 shadow-2xl group-hover:scale-110 transition-transform">
                <Zap size={40} fill="currentColor" />
             </div>
             
             <h2 className="text-5xl md:text-8xl font-[1000] text-white tracking-tighter leading-[0.85] mb-12">
                10x your outbound <br />
                <span className="opacity-50">in 2 minutes.</span>
             </h2>

             <p className="text-xl text-indigo-100 font-medium leading-relaxed mb-16 max-w-xl">
                The modern way to scale LinkedIn sales. Join 6,000+ top operators and start your free trial today.
             </p>

             <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
                <Link 
                  to="/dashboard" 
                  className="w-full sm:w-auto bg-white text-indigo-600 px-14 py-6 rounded-[24px] text-lg font-black uppercase tracking-widest hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  Get Started Free
                </Link>
                <button className="w-full sm:w-auto bg-indigo-700/50 backdrop-blur-xl text-white border border-indigo-400/30 px-14 py-6 rounded-[24px] text-lg font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                   <Play size={20} fill="currentColor" /> Watch Walkthrough
                </button>
             </div>

             <div className="mt-20 flex flex-wrap justify-center gap-8 opacity-40">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">No Credit Card Needed</p>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Setup in 120 Seconds</p>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Instant CRM Sync</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
