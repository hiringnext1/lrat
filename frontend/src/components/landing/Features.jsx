import React from 'react';
import { motion } from 'framer-motion';
import { Layers, MessageSquare, Zap, ShieldCheck, Users, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    title: "10x your volume with Multi-Account rotation.",
    desc: "Bypass LinkedIn's 100 requests per week limit safely. PipelineX automatically rotates between your accounts, distributing your outreach to reach 1,000+ leads every week.",
    icon: Layers,
    badge: "AGENCY SCALE",
    color: "indigo"
  },
  {
    title: "Unified Inbox for all your accounts.",
    desc: "Stop logging in and out of 10 different LinkedIn profiles. Manage every conversation from one powerful hub with AI-suggested replies.",
    icon: MessageSquare,
    badge: "OPERATIONS",
    color: "violet"
  },
  {
    title: "Humanized AI icebreakers with Claude.",
    desc: "Our engine uses Claude AI to analyze lead profiles and write hyper-personalized notes that actually get accepted. No more bot-like messages.",
    icon: Sparkles,
    badge: "INTELLIGENCE",
    color: "blue"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-40 bg-white">
      <div className="container mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-32">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-6">Capabilities</h2>
          <h3 className="text-4xl md:text-6xl font-[1000] text-slate-900 tracking-tighter leading-tight">
            The ultimate playbook for <br />
            <span className="text-slate-400">LinkedIn Growth.</span>
          </h3>
        </div>

        <div className="space-y-40">
          {FEATURES.map((f, i) => (
            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-20`}>
              {/* Text Content */}
              <div className="lg:w-1/2 space-y-8">
                <div className="inline-block px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                  {f.badge}
                </div>
                <h4 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight leading-[0.95]">
                  {f.title}
                </h4>
                <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-xl">
                  {f.desc}
                </p>
                <div className="pt-4">
                   <button className="flex items-center gap-2 text-indigo-600 font-black uppercase text-[11px] tracking-widest hover:gap-4 transition-all">
                     Explore Feature <Zap size={14} fill="currentColor" />
                   </button>
                </div>
              </div>

              {/* Stylized UI Mockup side */}
              <div className="lg:w-1/2 w-full">
                <motion.div 
                  initial={{ opacity: 0, x: i % 2 === 0 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative aspect-square bg-slate-50 rounded-[64px] border border-slate-100 flex items-center justify-center p-12 group overflow-hidden"
                >
                   {/* Abstract background graphics */}
                   <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,#818cf8_0%,transparent_70%)]" />
                   
                   {/* High fidelity card mockup */}
                   <div className="relative z-10 w-full bg-white rounded-[40px] shadow-2xl border border-slate-100 p-8 transform group-hover:scale-105 transition-transform duration-700">
                      <div className="flex items-center gap-4 mb-8">
                        <div className={`w-12 h-12 rounded-2xl bg-${f.color}-600 flex items-center justify-center text-white shadow-xl shadow-${f.color}-500/20`}>
                           <f.icon size={24} />
                        </div>
                        <div className="h-3 w-32 bg-slate-100 rounded-full" />
                      </div>
                      <div className="space-y-4">
                         <div className="h-2 w-full bg-slate-50 rounded-full" />
                         <div className="h-2 w-full bg-slate-50 rounded-full" />
                         <div className="h-2 w-3/4 bg-slate-50 rounded-full" />
                      </div>
                      <div className="mt-12 flex justify-between items-center">
                         <div className="flex -space-x-3">
                            {[1,2,3,4].map(j => <div key={j} className="w-10 h-10 rounded-full bg-slate-200 border-4 border-white" />)}
                         </div>
                         <div className={`px-4 py-2 rounded-full bg-${f.color}-50 text-${f.color}-600 text-[10px] font-black`}>ACTIVE</div>
                      </div>
                   </div>

                   {/* Floating accent for each feature */}
                   {i === 0 && (
                     <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute bottom-10 right-10 bg-emerald-500 text-white p-6 rounded-3xl shadow-2xl z-20 font-black text-sm">
                        +240% Volume
                     </motion.div>
                   )}
                   {i === 1 && (
                     <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-10 left-10 bg-indigo-600 text-white p-6 rounded-3xl shadow-2xl z-20 font-black text-sm">
                        Unified Hub
                     </motion.div>
                   )}
                   {i === 2 && (
                     <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-10 left-10 bg-amber-500 text-white p-6 rounded-3xl shadow-2xl z-20 font-black text-sm">
                        Claude Powered
                     </motion.div>
                   )}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
