import React from 'react';
import { Brain, AlertCircle, CheckCircle2, Info, Sparkles, Lightbulb, TrendingUp } from 'lucide-react';

export default function AiInsightsCard({ insights = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/80 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-150 dark:bg-slate-800 rounded-xl" />
          <div className="h-16 bg-slate-150 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900/80 dark:to-slate-950/40 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] relative overflow-hidden h-full flex flex-col justify-between">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full blur-3xl opacity-20 bg-gradient-to-tr from-purple-500 to-indigo-500" />
      
      <div className="relative z-10 flex-1">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Brain size={18} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest block">Machine Learning</span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">AI-Powered Sourcing Insights</h3>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-450 border border-purple-100 dark:border-purple-900/40 rounded-full">
            <Sparkles size={10} />
            GEN-AI ACTIVE
          </span>
        </div>

        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 border-dashed">
            <Lightbulb className="text-slate-300 dark:text-slate-600 mb-2" size={24} />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No active campaign logs found yet.</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">AI insights will populate once connection requests have been sent.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, idx) => {
              let iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/30';
              let Icon = Info;
              if (insight.type === 'warning') {
                iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30';
                Icon = AlertCircle;
              } else if (insight.type === 'success') {
                iconColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30';
                Icon = CheckCircle2;
              }

              return (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.005)] transition-all hover:translate-x-1"
                >
                  <div className="flex gap-3">
                    <div className={`p-1.5 rounded-lg border ${iconColor} flex items-center justify-center shrink-0 h-7 w-7`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide leading-none mb-1">
                        {insight.title}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-normal">
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100/50 dark:border-slate-800/40 flex items-center justify-between">
        <span className="text-[9px] text-slate-400 dark:text-slate-550 font-bold flex items-center gap-1">
          <TrendingUp size={10} /> Updated real-time based on template conversions
        </span>
      </div>
    </div>
  );
}
