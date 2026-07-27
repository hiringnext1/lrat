// Shared design system for all dashboard pages
// Import this in every page for consistent dark navy styling

export const PageBg = 'min-h-screen pb-24 text-left';
export const PageStyle = { background: '#080C18' }; // Inter via CSS :root, Sora via h1-h6 CSS rule

export function GlassCard({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl border border-white/8 ${className}`}
      style={{ background: 'rgba(13,18,33,0.7)', backdropFilter: 'blur(12px)', ...style }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ icon: Icon, title, subtitle, actions, accent = 'text-blue-400' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 font-display">
          <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center">
            <Icon size={17} className={accent} />
          </div>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1.5 ml-12">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function PrimaryBtn({ onClick, children, id }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
    >
      {children}
    </button>
  );
}

export function GhostBtn({ onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/8 text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${className}`}
    >
      {children}
    </button>
  );
}

export function DarkInput({ value, onChange, placeholder, icon: Icon, type = 'text', ...rest }) {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Icon size={14} className="text-slate-500" />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...rest}
        className={`w-full bg-white/5 border border-white/8 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all py-2.5 ${Icon ? 'pl-10 pr-4' : 'px-4'}`}
      />
    </div>
  );
}

export function DarkSelect({ value, onChange, children, icon: Icon }) {
  return (
    <div className="relative flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500/50 transition-all">
      {Icon && <Icon size={13} className="text-slate-500 shrink-0" />}
      <select
        value={value}
        onChange={onChange}
        className="bg-transparent text-white text-[10px] font-bold uppercase tracking-wider outline-none w-full cursor-pointer"
        style={{ colorScheme: 'dark' }}
      >
        {children}
      </select>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    paused:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    draft:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    stalled:   'bg-red-500/10 text-red-400 border-red-500/20',
    connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending_connection: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    connection_sent:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    replied:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  const cls = map[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${cls}`}>
      {(status || 'unknown').replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
        <Icon size={28} className="text-slate-600" />
      </div>
      <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
      <p className="text-[10px] text-slate-500 font-medium mt-2 max-w-xs leading-relaxed">{subtitle}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{text}</p>
    </div>
  );
}
