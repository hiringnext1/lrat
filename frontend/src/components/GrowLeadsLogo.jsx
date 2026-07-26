import React from 'react';
import { TrendingUp, Sparkles, Zap } from 'lucide-react';

export default function GrowLeadsLogo({ size = 'md', className = '', showText = true }) {
  const sizes = {
    sm: { icon: 'w-7 h-7 rounded-lg', iconSize: 14, text: 'text-base' },
    md: { icon: 'w-9 h-9 rounded-xl', iconSize: 18, text: 'text-xl' },
    lg: { icon: 'w-11 h-11 rounded-2xl', iconSize: 22, text: 'text-2xl' },
    xl: { icon: 'w-14 h-14 rounded-2xl', iconSize: 28, text: 'text-3xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Dynamic 3D Gradient Icon */}
      <div className={`${s.icon} bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 shrink-0 relative group`}>
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-blue-500 rounded-[inherit] blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
        
        {/* Custom Growth Sparkle SVG */}
        <div className="relative z-10 flex items-center justify-center text-white">
          <svg className="w-4/6 h-4/6 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 7L13.5 15.5L8.5 10.5L2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex items-center tracking-tight font-black uppercase">
          <span className={`${s.text} text-white font-black tracking-tight`}>Grow</span>
          <span className={`${s.text} text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-black tracking-tight`}>Leads</span>
        </div>
      )}
    </div>
  );
}
