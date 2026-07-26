import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Megaphone, UserCheck, Inbox,
  ShieldCheck, Settings, FileText, LogOut, CreditCard,
  Ban, Zap, TrendingUp, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../socket';
import SourcingTracker from './SourcingTracker';

export default function Sidebar() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(socket.connected);

  let user = {};
  try {
    const raw = localStorage.getItem('lrat_user');
    if (raw && raw !== 'undefined') user = JSON.parse(raw);
  } catch (e) {}

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/dashboard/accounts', icon: Users, label: 'Accounts' },
    { to: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/dashboard/leads', icon: UserCheck, label: 'Leads' },
    { to: '/dashboard/inbox', icon: Inbox, label: 'Inbox', badge: true },
    { to: '/dashboard/templates', icon: FileText, label: 'Templates' },
    { to: '/dashboard/blacklist', icon: Ban, label: 'Blacklist' },
    { to: '/dashboard/safety', icon: ShieldCheck, label: 'Safety' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    { to: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/dashboard/admin', icon: ShieldCheck, label: 'Admin Panel' });
  }

  const handleLogout = () => {
    localStorage.removeItem('lrat_token');
    localStorage.removeItem('lrat_user');
    window.location.href = '/login';
  };

  async function fetchUnreadCount() {
    try {
      const res = await axios.get('/api/inbox/unread-count');
      if (res.data?.success) setUnreadCount(res.data.count);
    } catch (e) {}
  }

  useEffect(() => {
    fetchUnreadCount();
    window.addEventListener('inbox_updated', fetchUnreadCount);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onReply = () => fetchUnreadCount();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_reply', onReply);
    return () => {
      window.removeEventListener('inbox_updated', fetchUnreadCount);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_reply', onReply);
    };
  }, []);

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0 text-left overflow-hidden" style={{ background: '#0D1221', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Zap size={15} className="text-white fill-white" />
          </div>
          <div>
            <span className="text-sm font-black text-white tracking-tight uppercase">LRAT</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav Section Label */}
      <div className="px-5 pt-5 pb-2">
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
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
                {badge && unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sourcing Tracker */}
      <SourcingTracker />

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/6 transition-colors group">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
            {userInitials}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-[9px] text-slate-600 truncate font-medium">{user?.email || ''}</p>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-[9px] text-slate-700 font-semibold tracking-wider uppercase">v1.1.0 · B2B Lead Gen</span>
        </div>
      </div>
    </aside>
  );
}
