import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Campaigns from './pages/Campaigns';
import CampaignBuilder from './pages/CampaignBuilder';
import Leads from './pages/Leads';
import Inbox from './pages/Inbox';
import Templates from './pages/Templates';
import Safety from './pages/Safety';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Onboarding from './pages/Onboarding';
import Blacklist from './pages/Blacklist';
import Admin from './pages/Admin';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import Login from './pages/Login';
import Signup from './pages/Signup';
import axios from 'axios';

// Configure Axios request and response interceptors
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lrat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('lrat_token');
      localStorage.removeItem('lrat_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Route Guard Component
function RequireAuth({ children }) {
  const token = localStorage.getItem('lrat_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let user = {};
  try {
    const raw = localStorage.getItem('lrat_user');
    if (raw && raw !== 'undefined') {
      user = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage:', e);
  }

  // Check if user onboarding is incomplete (admins bypass onboarding)
  if (user && user.role !== 'admin' && user.onboarding_completed === 0 && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// Admin Route Guard Component
function RequireAdmin({ children }) {
  let user = {};
  try {
    const raw = localStorage.getItem('lrat_user');
    if (raw && raw !== 'undefined') {
      user = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse user from localStorage:', e);
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/onboarding" 
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route 
          path="/dashboard" 
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/new/build" element={<CampaignBuilder />} />
          <Route path="campaigns/:id/build" element={<CampaignBuilder />} />
          <Route path="leads" element={<Leads />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="templates" element={<Templates />} />
          <Route path="safety" element={<Safety />} />
          <Route path="blacklist" element={<Blacklist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="billing" element={<Billing />} />
          <Route path="advanced-analytics" element={<AdvancedAnalytics />} />
          <Route 
            path="admin" 
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
