import { useEffect, useState } from 'react';
import { Ban, Trash2, Plus, Upload, AlertCircle, FileText, CheckCircle2, ShieldAlert, Search, Filter } from 'lucide-react';
import axios from 'axios';
import { GlassCard, PageHeader, PrimaryBtn, GhostBtn, EmptyState, LoadingSpinner, PageBg, PageStyle } from '../components/PageShell';
import { AnimatePresence, motion } from 'framer-motion';

export default function Blacklist() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [type, setType] = useState('profile');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkType, setBulkType] = useState('profile');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchBlacklist() {
    try {
      const res = await axios.get('/api/blacklist');
      if (res.data?.success) setEntries(res.data.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { fetchBlacklist(); }, []);

  async function handleAddSingle(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await axios.post('/api/blacklist', { type, value: value.trim(), reason: reason.trim() });
      if (res.data?.success) { setEntries(res.data.data); setValue(''); setReason(''); setSuccess('Added to blacklist!'); setTimeout(() => setSuccess(''), 3000); }
    } catch (err) { setError(err.response?.data?.error || 'Failed to add entry.'); } finally { setSubmitting(false); }
  }

  async function handleAddBulk(e) {
    e.preventDefault();
    if (!bulkText.trim()) return;
    setSubmitting(true); setError(''); setSuccess('');
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const payloadEntries = lines.map(line => {
      const parts = line.split(',');
      if (parts.length >= 2 && ['profile', 'company', 'domain'].includes(parts[1].trim().toLowerCase()))
        return { value: parts[0].trim(), type: parts[1].trim().toLowerCase(), reason: parts[2] ? parts[2].trim() : 'Bulk imported' };
      return { value: line, type: bulkType, reason: 'Bulk imported' };
    });
    try {
      const res = await axios.post('/api/blacklist/import', { entries: payloadEntries });
      if (res.data?.success) { setEntries(res.data.data); setBulkText(''); setBulkMode(false); setSuccess(`Imported ${res.data.importedCount} entries!`); setTimeout(() => setSuccess(''), 5000); }
    } catch (err) { setError(err.response?.data?.error || 'Failed to import.'); } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this entry?')) return;
    try {
      const res = await axios.delete(`/api/blacklist/${id}`);
      if (res.data?.success) { setEntries(res.data.data); setSuccess('Removed.'); setTimeout(() => setSuccess(''), 2000); }
    } catch (err) { setError('Failed to remove.'); }
  }

  function handleCSVUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setBulkText(ev.target.result); setBulkMode(true); };
    reader.readAsText(file);
  }

  const filteredEntries = entries.filter(entry => {
    const matchType = filterType === 'all' || entry.type === filterType;
    const matchSearch = (entry.value || '').toLowerCase().includes(searchQuery.toLowerCase()) || (entry.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const typeColors = {
    profile: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    company: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    domain:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={Ban}
        title="DNC Blacklist"
        subtitle="Prevent outreach to specific profiles, companies, or domains"
        accent="text-red-400"
        actions={
          <GhostBtn onClick={() => setBulkMode(!bulkMode)}>
            {bulkMode ? <Plus size={13} /> : <Upload size={13} />}
            {bulkMode ? 'Single Entry' : 'Bulk Import'}
          </GhostBtn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Blocked', val: entries.length, color: 'text-red-400' },
          { label: 'Profiles', val: entries.filter(e => e.type === 'profile').length, color: 'text-indigo-400' },
          { label: 'Companies', val: entries.filter(e => e.type === 'company').length, color: 'text-amber-400' },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{val}</p>
          </GlassCard>
        ))}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {success && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={13} />{success}</motion.div>}
        {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-[10px] font-bold uppercase tracking-wider"><AlertCircle size={13} />{error}</motion.div>}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form Panel */}
        <GlassCard className="p-5 lg:col-span-1 h-fit">
          {!bulkMode ? (
            <form onSubmit={handleAddSingle} className="space-y-4">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Add Rule</h3>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{id:'profile',label:'URL'},{id:'company',label:'Company'},{id:'domain',label:'Domain'}].map(t => (
                    <button key={t.id} type="button" onClick={() => setType(t.id)}
                      className={`py-2 text-[9px] font-black rounded-xl border transition-all uppercase tracking-wider ${type === t.id ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-white/8 text-slate-500 hover:text-white hover:bg-white/8'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  {type === 'profile' ? 'LinkedIn URL' : type === 'company' ? 'Company Name' : 'Email Domain'}
                </label>
                <input type="text" required value={value} onChange={e => setValue(e.target.value)}
                  placeholder={type === 'profile' ? 'linkedin.com/in/...' : type === 'company' ? 'Acme Corp' : 'competitor.com'}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Reason (optional)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g. Competitor, Current Client"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50">
                {submitting ? 'Adding...' : '+ Add to Blacklist'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddBulk} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Bulk Import</h3>
                <label className="flex items-center gap-1 cursor-pointer text-[9px] text-blue-400 font-black uppercase tracking-wider hover:text-blue-300">
                  <FileText size={11} /> CSV
                  <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Fallback Type</label>
                <select value={bulkType} onChange={e => setBulkType(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500/50"
                  style={{ colorScheme: 'dark' }}>
                  <option value="profile">Profile URL</option>
                  <option value="company">Company Name</option>
                  <option value="domain">Email Domain</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Paste list (one per line)</label>
                <textarea required value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8}
                  placeholder={"linkedin.com/in/user-a\nlinkedin.com/in/user-b\nGoogle\nNetflix, company, competitor"}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                />
                <span className="text-[9px] text-slate-600 block mt-1">Format: value [, type, reason]</span>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50">
                {submitting ? 'Importing...' : 'Import List'}
              </button>
            </form>
          )}

          {/* DNC Guard Note */}
          <div className="mt-5 p-3 rounded-xl flex gap-2.5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
            <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-1">DNC Guard Active</p>
              <p className="text-[9px] text-slate-500 leading-relaxed">Automation engine automatically skips blacklisted profiles and companies before sending any requests.</p>
            </div>
          </div>
        </GlassCard>

        {/* Table Panel */}
        <GlassCard className="p-5 lg:col-span-2">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4 pb-4 border-b border-white/8">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">
              Active Rules <span className="text-slate-600 ml-1">({filteredEntries.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-white/5 border border-white/8 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/50 w-36"
                />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500/50"
                style={{ colorScheme: 'dark' }}>
                <option value="all">All Types</option>
                <option value="profile">Profile</option>
                <option value="company">Company</option>
                <option value="domain">Domain</option>
              </select>
            </div>
          </div>

          {loading ? <LoadingSpinner text="Loading rules..." /> :
           filteredEntries.length === 0 ? (
            <EmptyState icon={Ban} title="No blacklist rules" subtitle="Add profile URLs or companies to block them from your campaigns." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-white/6">
                    {['Type', 'Value', 'Reason', 'Remove'].map(h => (
                      <th key={h} className="py-3 px-3 text-slate-600 font-black text-[8px] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-lg border ${typeColors[entry.type] || typeColors.profile}`}>
                          {entry.type === 'profile' ? 'URL' : entry.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white max-w-[200px] truncate" title={entry.value}>{entry.value}</td>
                      <td className="py-3 px-3 text-slate-500 max-w-[160px] truncate" title={entry.reason}>{entry.reason || '—'}</td>
                      <td className="py-3 px-3">
                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
