import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Megaphone, UserCheck, Inbox, ShieldCheck, Moon, Sun, Settings, FileText, LogOut, CreditCard, TrendingUp, Ban } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import socket from '../socket';
import SourcingTracker from './SourcingTracker';

export default function Sidebar() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(socket.connected);

  let user = {};
  try {
    const raw = localStorage.getItem('lrat_user');
    if (raw && raw !== 'undefined') {
      user = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse user in Sidebar:', e);
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/dashboard/accounts', icon: Users, label: 'Accounts' },
    { to: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/dashboard/leads', icon: UserCheck, label: 'Leads' },
    { to: '/dashboard/inbox', icon: Inbox, label: 'Inbox' },
    { to: '/dashboard/templates', icon: FileText, label: 'Templates' },
    { to: '/dashboard/blacklist', icon: Ban, label: 'Blacklist' },
    { to: '/dashboard/safety', icon: ShieldCheck, label: 'Safety' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    { to: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  ];

  if (user && user.role === 'admin') {
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
      if (res.data?.success) {
        setUnreadCount(res.data.count);
      }
    } catch (e) {
      console.error('Failed to fetch unread count:', e);
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    fetchUnreadCount();

    window.addEventListener('inbox_updated', fetchUnreadCount);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onReply = () => {
      fetchUnreadCount();
    };

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

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 dark:bg-gray-950 flex flex-col h-screen sticky top-0 text-left">
      <div className="px-4 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">LR</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-wide">LRAT</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-500">{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
            onClick={() => label === 'Inbox' && setUnreadCount(0)}
          >
            <Icon size={17} />
            <span>{label}</span>
            {label === 'Inbox' && unreadCount > 0 && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Persistent Sourcing Progress Tracker */}
      <SourcingTracker />

      {/* User profile & Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center justify-between gap-2 px-1 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-200 truncate">{user.name || 'User Account'}</p>
            <p className="text-[10px] text-gray-500 truncate">{user.email || ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-800/40">
          <span className="text-[10px] text-gray-600 font-semibold tracking-wider uppercase">v1.1.0 (SaaS)</span>
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Toggle dark mode"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
