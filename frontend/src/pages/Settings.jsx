import { useEffect, useState } from 'react';
import { Save, User, Building2, Globe, Mail, Briefcase, CheckCircle, AlertCircle, Loader, Settings as SettingsIcon, Slack, Zap, Bell, Sliders, Lock, Download, Trash2, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export default function Settings() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    designation: '',
    company_name: '',
    company_website: '',
    webhook_url: '',
    webhook_enabled: false,
    webhook_trigger_type: 'positive_reply',
    slack_webhook_url: '',
    slack_alerts_enabled: false,
    email_digest_enabled: true,
    timezone: 'Asia/Kolkata',
  });
  const [scoringForm, setScoringForm] = useState({
    seniority: { executive: 40, manager: 30, senior: 20, junior: 10 },
    companySize: { large: 30, medium: 20, small: 10 },
    responsiveness: { replied: 30 }
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

  // Security + account controls
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwState, setPwState] = useState({ busy: false, msg: '', type: '' });
  const [del, setDel] = useState({ open: false, password: '', confirm: '', busy: false, error: '' });

  async function changePassword() {
    if (pw.new_password !== pw.confirm) return setPwState({ busy: false, msg: 'New passwords do not match', type: 'error' });
    if (pw.new_password.length < 6) return setPwState({ busy: false, msg: 'New password must be at least 6 characters', type: 'error' });
    setPwState({ busy: true, msg: '', type: '' });
    try {
      const res = await axios.post('/api/auth/change-password', {
        current_password: pw.current_password, new_password: pw.new_password,
      });
      setPwState({ busy: false, msg: res.data?.message || 'Password updated', type: 'success' });
      setPw({ current_password: '', new_password: '', confirm: '' });
    } catch (e) {
      setPwState({ busy: false, msg: e.response?.data?.error || 'Could not change password', type: 'error' });
    }
  }

  async function exportData() {
    try {
      const res = await axios.get('/api/auth/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `growleadz-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setSaveMsg({ type: 'error', text: 'Export failed' });
    }
  }

  async function deleteAccount() {
    setDel(d => ({ ...d, busy: true, error: '' }));
    try {
      await axios.delete('/api/auth/account', { data: { password: del.password, confirm: del.confirm } });
      localStorage.removeItem('lrat_token');
      localStorage.removeItem('lrat_user');
      window.location.href = '/';
    } catch (e) {
      setDel(d => ({ ...d, busy: false, error: e.response?.data?.error || 'Could not delete account' }));
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/auth/me'),
      axios.get('/api/settings')
    ])
      .then(([profileRes, settingsRes]) => {
        const u = profileRes.data.data || {};
        setForm({
          name: u.name || '',
          email: u.email || '',
          designation: u.designation || '',
          company_name: u.company_name || '',
          company_website: u.company_website || '',
          webhook_url: u.webhook_url || '',
          webhook_enabled: !!u.webhook_enabled,
          webhook_trigger_type: u.webhook_trigger_type || 'positive_reply',
          slack_webhook_url: u.slack_webhook_url || '',
          slack_alerts_enabled: !!u.slack_alerts_enabled,
          email_digest_enabled: u.email_digest_enabled !== undefined ? !!u.email_digest_enabled : true,
          timezone: u.timezone || 'Asia/Kolkata',
        });

        if (settingsRes.data?.success && settingsRes.data.data?.LEAD_SCORING_WEIGHTS) {
          try {
            const parsed = JSON.parse(settingsRes.data.data.LEAD_SCORING_WEIGHTS);
            setScoringForm(parsed);
          } catch (e) {
            console.error('Failed to parse lead scoring weights:', e);
          }
        }
      })
      .catch((e) => {
        console.error('Failed to load profile details or settings:', e);
      })
      .finally(() => setLoading(false));
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setScoringField(category, key, value) {
    setScoringForm(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  }

  async function save() {
    setSaving(true);
    setSaveMsg({ type: '', text: '' });
    try {
      // 1. Save Profile settings
      await axios.put('/api/auth/profile', {
        name: form.name,
        designation: form.designation,
        company_name: form.company_name,
        company_website: form.company_website,
        webhook_url: form.webhook_url,
        webhook_enabled: form.webhook_enabled,
        webhook_trigger_type: form.webhook_trigger_type,
        slack_webhook_url: form.slack_webhook_url,
        slack_alerts_enabled: form.slack_alerts_enabled,
        email_digest_enabled: form.email_digest_enabled,
        timezone: form.timezone,
      });

      // 2. Save Lead Scoring weights
      await axios.put('/api/settings', {
        LEAD_SCORING_WEIGHTS: JSON.stringify(scoringForm)
      });

      // 3. Recalculate lead scores
      const recalcRes = await axios.post('/api/leads/recalculate');

      setSaveMsg({ 
        type: 'success', 
        text: recalcRes.data?.message || 'Settings saved and lead scores updated!' 
      });
    } catch (e) {
      setSaveMsg({ type: 'error', text: 'Failed to update settings' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg({ type: '', text: '' }), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen">
        <div className="w-8 h-8 border-3 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 animate-pulse">Syncing profile details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen max-w-3xl text-left relative overflow-hidden pb-20">
      
      {/* Background ambient glowing mesh */}
      <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-blue-500 to-indigo-500 pointer-events-none" />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="text-slate-700 dark:text-slate-300" size={28} strokeWidth={2.5} />
            Account & Workspace Settings
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Manage your personal profile, company details, and external integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 relative z-10">
        
        {/* Personal Details Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 space-y-5 shadow-[0_4px_15px_rgb(0,0,0,0.002)] animate-in fade-in duration-300">
          <div className="pb-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Personal Profile</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Your personal settings and application role</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  disabled
                  placeholder="name@company.com"
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold bg-slate-100 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed outline-none"
                />
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Designation / Role</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setField('designation', e.target.value)}
                  placeholder="e.g. Talent Acquisition Specialist, Founder"
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all placeholder:text-slate-300"
                />
                <Briefcase size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Timezone</label>
              <div className="relative">
                <select
                  value={form.timezone}
                  onChange={(e) => setField('timezone', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                >
                  <option value="Asia/Kolkata">India (IST) - Asia/Kolkata</option>
                  <option value="Europe/London">United Kingdom (GMT/BST) - Europe/London</option>
                  <option value="Europe/Berlin">Central Europe (CET) - Europe/Berlin</option>
                  <option value="America/New_York">US East (EST/EDT) - America/New_York</option>
                  <option value="America/Chicago">US Central (CST/CDT) - America/Chicago</option>
                  <option value="America/Denver">US Mountain (MST/MDT) - America/Denver</option>
                  <option value="America/Los_Angeles">US West (PST/PDT) - America/Los_Angeles</option>
                  <option value="Asia/Singapore">Singapore (SGT) - Asia/Singapore</option>
                  <option value="Australia/Sydney">Australia (AEST/AEDT) - Australia/Sydney</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Details Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 space-y-5 shadow-[0_4px_15px_rgb(0,0,0,0.002)] animate-in fade-in duration-300">
          <div className="pb-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Company Profile</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Configure your organization and workspace brand</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company Name</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setField('company_name', e.target.value)}
                placeholder="Enter company name"
                className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company Website</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.company_website}
                  onChange={(e) => setField('company_website', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold bg-slate-50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all placeholder:text-slate-300"
                />
                <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Scoring Rules Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 space-y-5 shadow-[0_4px_15px_rgb(0,0,0,0.002)] animate-in fade-in duration-300">
          <div className="pb-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center gap-2">
            <Sliders className="text-blue-600 animate-pulse" size={18} />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Lead Fit Scoring weights</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Configure point weights to automatically calculate lead fit (0-100)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Seniority column */}
            <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Seniority Weights</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Executive (C-Level/Founder)</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.seniority?.executive ?? 40}
                    onChange={(e) => setScoringField('seniority', 'executive', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Manager/Lead</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.seniority?.manager ?? 30}
                    onChange={(e) => setScoringField('seniority', 'manager', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Senior Professional</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.seniority?.senior ?? 20}
                    onChange={(e) => setScoringField('seniority', 'senior', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Junior/Associate/Intern</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.seniority?.junior ?? 10}
                    onChange={(e) => setScoringField('seniority', 'junior', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Company size column */}
            <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Company Size Weights</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Large (MNC / 1000+ employees)</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.companySize?.large ?? 30}
                    onChange={(e) => setScoringField('companySize', 'large', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Medium (100-999 employees)</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.companySize?.medium ?? 20}
                    onChange={(e) => setScoringField('companySize', 'medium', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Small (1-99 employees)</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.companySize?.small ?? 10}
                    onChange={(e) => setScoringField('companySize', 'small', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Responsiveness column */}
            <div className="space-y-3 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Responsiveness</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Replied bonus points</label>
                  <input
                    type="number" min="0" max="100"
                    value={scoringForm.responsiveness?.replied ?? 30}
                    onChange={(e) => setScoringField('responsiveness', 'replied', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-blue-50/40 dark:bg-slate-900 border border-blue-100/50 dark:border-slate-800/80">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-normal">
                  💡 Leads with scores &ge; 80 will automatically be marked as "Hot Leads" in your inbox pipeline.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Webhooks & Alerts Integrations Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-[0_4px_15px_rgb(0,0,0,0.002)] animate-in fade-in duration-300">
          <div className="pb-3.5 border-b border-slate-50 dark:border-slate-800/50 flex items-center gap-2">
            <Zap size={18} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Workflow Integrations & Alerts</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Connect slack channels, CRMs, and email reports</p>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* 1. Slack Alert Integration */}
            <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Slack size={18} className="text-[#E01E5A]" />
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Slack Alerts</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Send positive prospect replies directly to Slack</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.slack_alerts_enabled}
                    onChange={(e) => setField('slack_alerts_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {form.slack_alerts_enabled && (
                <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Slack Webhook URL</label>
                  <input
                    type="text"
                    value={form.slack_webhook_url}
                    onChange={(e) => setField('slack_webhook_url', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  />
                </div>
              )}
            </div>

            {/* 2. Zapier/Make Webhook Integration */}
            <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-[#ff4a00]" />
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Outbound Webhooks (CRM/Zapier)</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Trigger external triggers for CRM syncing</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.webhook_enabled}
                    onChange={(e) => setField('webhook_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {form.webhook_enabled && (
                <div className="space-y-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Webhook Endpoint URL</label>
                    <input
                      type="text"
                      value={form.webhook_url}
                      onChange={(e) => setField('webhook_url', e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold bg-white dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-100/30 focus:border-blue-500 transition-all placeholder:text-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trigger Condition</label>
                    <select
                      value={form.webhook_trigger_type}
                      onChange={(e) => setField('webhook_trigger_type', e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-extrabold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase tracking-wider outline-none"
                    >
                      <option value="positive_reply">On Positive replies / Hot Leads</option>
                      <option value="all_replies">On All incoming messages</option>
                      <option value="connection_accepted">On Connections accepted</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Daily Email Digest Integration */}
            <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Daily Email Summary</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Receive daily performance statistics recap emails</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.email_digest_enabled}
                  onChange={(e) => setField('email_digest_enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

          </div>
        </div>


        {/* ═══ SECURITY ═══════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Lock size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Password</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Change the password you sign in with</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: 'current_password', label: 'Current password' },
              { key: 'new_password', label: 'New password' },
              { key: 'confirm', label: 'Confirm new password' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{f.label}</label>
                <input
                  type="password"
                  autoComplete={f.key === 'current_password' ? 'current-password' : 'new-password'}
                  value={pw[f.key]}
                  onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 dark:text-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={changePassword}
              disabled={pwState.busy || !pw.current_password || !pw.new_password}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95"
            >
              {pwState.busy ? <Loader size={13} className="animate-spin" /> : <Lock size={13} strokeWidth={2.5} />}
              Update password
            </button>
            {pwState.msg && (
              <span className={`text-[10px] font-black uppercase tracking-wider ${pwState.type === 'success' ? 'text-emerald-500' : 'text-rose-400'}`}>
                {pwState.msg}
              </span>
            )}
          </div>
        </div>

        {/* ═══ YOUR DATA ══════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Download size={15} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Your data</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Download everything, or close your account</p>
            </div>
          </div>

          <button
            onClick={exportData}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Download size={13} strokeWidth={2.5} />
            Export my data (JSON)
          </button>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Profile, LinkedIn accounts, campaigns, leads and activity history.</p>

          <div className="mt-6 pt-5 border-t border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={14} className="text-rose-500" />
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-wider">Danger zone</h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Deleting your account removes your campaigns, leads, activity history and disconnects your LinkedIn
              accounts. This cannot be undone — export your data first if you may want it.
            </p>

            {!del.open ? (
              <button
                onClick={() => setDel(d => ({ ...d, open: true }))}
                className="flex items-center gap-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
              >
                <Trash2 size={13} strokeWidth={2.5} />
                Delete my account
              </button>
            ) : (
              <div className="space-y-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4">
                <input
                  type="password"
                  placeholder="Your password"
                  value={del.password}
                  onChange={e => setDel(d => ({ ...d, password: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none"
                />
                <input
                  placeholder="Type DELETE to confirm"
                  value={del.confirm}
                  onChange={e => setDel(d => ({ ...d, confirm: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 dark:text-slate-200 outline-none"
                />
                {del.error && <p className="text-[11px] font-bold text-rose-500">{del.error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={deleteAccount}
                    disabled={del.busy || del.confirm !== 'DELETE' || !del.password}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                  >
                    {del.busy ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={2.5} />}
                    Permanently delete
                  </button>
                  <button
                    onClick={() => setDel({ open: false, password: '', confirm: '', busy: false, error: '' })}
                    className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Save Action Footer */}
      <div className="flex items-center gap-4 relative z-10 pt-4">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-60 transition-all shadow-md active:scale-95"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2.5} />}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
        
        {saveMsg.text && (
          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {saveMsg.type === 'success' ? <CheckCircle size={12} strokeWidth={2.5} /> : <AlertCircle size={12} strokeWidth={2.5} />}
            {saveMsg.text}
          </span>
        )}
      </div>
      
    </div>
  );
}
