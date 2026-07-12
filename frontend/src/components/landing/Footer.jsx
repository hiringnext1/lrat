import React from 'react';
import { Zap, Twitter, Linkedin, Github, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white pt-32 pb-12 border-t border-slate-100">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div className="col-span-1 md:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Zap className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight uppercase">PipelineX</span>
            </div>
            <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
              The high-performance LinkedIn automation tool for agencies and sales teams. 10x your volume safely.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Twitter size={18} /></a>
              <a href="#" className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Linkedin size={18} /></a>
              <a href="#" className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Github size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-8">Playbook</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Solutions</a></li>
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Multi-Account</a></li>
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Claude AI</a></li>
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-8">Trust</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Terms of Service</a></li>
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">GDPR Compliance</a></li>
              <li><a href="#" className="text-slate-500 hover:text-indigo-600 font-bold text-[13px] transition-colors uppercase tracking-wide">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-slate-50 gap-6">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            © 2026 PipelineX Technologies Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-3 bg-slate-50 px-5 py-2 rounded-full border border-slate-100 shadow-sm">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">All nodes operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
