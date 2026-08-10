import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Megaphone, Inbox, ShieldCheck, 
  Settings, CreditCard, Sliders, LogOut, ChevronRight, UserCheck2,
  Lock, Sparkles, UserCheck, Zap, Ban, BarChart3, HelpCircle
} from 'lucide-react';
import socket from '../socket';
import GrowLeadsLogo from './GrowLeadsLogo';

export default function Sidebar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  let user = {};
  try {
    const raw = localStorage.getItem('lrat_user');
    if (raw && raw !== 'undefined') user = JSON.parse(raw);
  } catch (e) { console.error(e); }

  const isAdmin = user?.role === 'admin';

  // Unread count in the tab title: when the app sits in a background tab this
  // is the only signal the user actually sees.
  useEffect(() => {
    const base = 'GrowLeadz';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
    return () => { document.title = base; };
  }, [unreadCount]);

  useEffect(() => {
    const onInboxUpdated = () => fetchUnread();

    socket.on('new_reply', onInboxUpdated);
    window.addEventListener('inbox_updated', onInboxUpdated);

    // The socket is the fast path, but a dropped connection (laptop asleep,
    // network change) would leave the count stale until a manual reload. Poll
    // as a floor, and refresh whenever the user comes back to the tab.
    const poll = setInterval(fetchUnread, 60000);
    const onFocus = () => fetchUnread();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    fetchUnread();

    return () => {
      socket.off('new_reply', onInboxUpdated);
      window.removeEventListener('inbox_updated', onInboxUpdated);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(poll);
    };
  }, []);

  async function fetchUnread() {
    try {
      const token = localStorage.getItem('lrat_token');
      if (!token) return;
      const res = await fetch('/api/inbox/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUnreadCount(data.count);
    } catch (e) { console.error(e); }
  }

  const handleLogout = () => {
    localStorage.removeItem('lrat_token');
    localStorage.removeItem('lrat_user');
    window.location.href = '/login';
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/dashboard/leads', icon: Users, label: 'Leads CRM' },
    { to: '/dashboard/inbox', icon: Inbox, label: 'Inbox', badge: unreadCount },
    { to: '/dashboard/accounts', icon: ShieldCheck, label: 'Accounts' },
    { to: '/dashboard/templates', icon: Sparkles, label: 'Templates' },
    { to: '/dashboard/safety', icon: UserCheck, label: 'Safety Monitor' },
    { to: '/dashboard/blacklist', icon: Ban, label: 'Blacklist DNC' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    { to: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
    ...(isAdmin ? [{ to: '/dashboard/admin', icon: Lock, label: 'Super Admin', badge: 'ADMIN' }] : []),
  ];

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0 text-left overflow-hidden select-none" style={{ background: '#0D1221', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/6 flex items-center">
        <GrowLeadsLogo size="md" />
      </div>

      {/* Nav Section Label */}
      <div className="px-5 pt-4 pb-2">
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Navigation</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {navItems.map(({ to, icon: Icon, label, exact, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => label === 'Inbox' && setUnreadCount(0)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1 truncate">{label}</span>
                {badge > 0 && typeof badge === 'number' && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-blue-500 text-white rounded-full">
                    {badge}
                  </span>
                )}
                {badge === 'ADMIN' && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                    ADMIN
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-white/6">
        <div className="p-2.5 rounded-xl bg-white/4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-black uppercase shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[9px] text-slate-500 font-medium truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-1 text-slate-500 hover:text-red-400 rounded-lg transition-colors" title="Logout">
            <LogOut size={13} />
          </button>
        </div>
      </div>

    </aside>
  );
}
