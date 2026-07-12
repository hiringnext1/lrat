import { useEffect, useState } from 'react';
import { Ban, Trash2, Plus, Upload, AlertCircle, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export default function Blacklist() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Single Entry Form
  const [type, setType] = useState('profile');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  // Bulk Paste / Import
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkType, setBulkType] = useState('profile');

  // Filters & Search
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchBlacklist() {
    try {
      const res = await axios.get('/api/blacklist');
      if (res.data?.success) {
        setEntries(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch blacklist:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBlacklist();
  }, []);

  async function handleAddSingle(e) {
    e.preventDefault();
    if (!value.trim()) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await axios.post('/api/blacklist', {
        type,
        value: value.trim(),
        reason: reason.trim()
      });

      if (res.data?.success) {
        setEntries(res.data.data);
        setValue('');
        setReason('');
        setSuccess('Successfully added entry to blacklist!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add entry. Please check subscription status.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddBulk(e) {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    // Parse bulk text: one entry per line
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const payloadEntries = lines.map(line => {
      // Check if it's comma separated value, type, reason
      const parts = line.split(',');
      if (parts.length >= 2 && ['profile', 'company', 'domain'].includes(parts[1].trim().toLowerCase())) {
        return {
          value: parts[0].trim(),
          type: parts[1].trim().toLowerCase(),
          reason: parts[2] ? parts[2].trim() : 'Bulk imported'
        };
      }
      // Otherwise fallback to selected bulkType
      return {
        value: line,
        type: bulkType,
        reason: 'Bulk imported'
      };
    });

    try {
      const res = await axios.post('/api/blacklist/import', { entries: payloadEntries });
      if (res.data?.success) {
        setEntries(res.data.data);
        setBulkText('');
        setBulkMode(false);
        setSuccess(`Successfully imported ${res.data.importedCount} entries to blacklist!`);
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import bulk list.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to remove this entry from the blacklist?')) return;
    
    try {
      const res = await axios.delete(`/api/blacklist/${id}`);
      if (res.data?.success) {
        setEntries(res.data.data);
        setSuccess('Removed entry from blacklist.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove entry.');
    }
  }

  // Handle client-side CSV parsing
  function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setBulkText(text);
      setBulkMode(true);
    };
    reader.readAsText(file);
  }

  // Filtered blacklist entries
  const filteredEntries = entries.filter(entry => {
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesSearch = 
      (entry.value || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden">
      
      {/* Background ambient glowing mesh */}
      <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-red-500 to-indigo-500 pointer-events-none" />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Ban className="text-red-500 dark:text-red-400 animate-pulse" size={28} strokeWidth={2.5} />
            Do-Not-Contact (DNC) Blacklist
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Prevent outreach to specific prospect profiles, companies, or domains</p>
        </div>
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-sm transition-all"
        >
          {bulkMode ? <Plus size={14} /> : <Upload size={14} />}
          {bulkMode ? 'Add Single Entry' : 'Bulk Import List'}
        </button>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-semibold relative z-10">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-semibold relative z-10">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Input Form Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
          {!bulkMode ? (
            <form onSubmit={handleAddSingle} className="space-y-4">
              <h2 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Add Blacklist Rule</h2>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Rule Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'profile', label: 'URL' },
                    { id: 'company', label: 'Company' },
                    { id: 'domain', label: 'Domain' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`py-2 px-3 text-xs font-extrabold rounded-xl border text-center transition-all ${
                        type === t.id
                          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400'
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                  {type === 'profile' && 'LinkedIn Profile URL'}
                  {type === 'company' && 'Company Name'}
                  {type === 'domain' && 'Email Domain (e.g. competitor.com)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    type === 'profile' ? 'https://www.linkedin.com/in/username' : 
                    type === 'company' ? 'Acme Corp' : 'competitor.com'
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-3 text-xs font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Reason (Optional)</label>
                <textarea
                  placeholder="e.g. Competitor, Current Client, Partner"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 text-xs font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-red-500 hover:bg-red-650 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? 'Adding...' : 'Add to Blacklist'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddBulk} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Bulk Import</h2>
                
                <label className="flex items-center gap-1 cursor-pointer text-[10px] font-black text-blue-600 hover:text-blue-500 uppercase tracking-wide">
                  <FileText size={12} />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Fallback Type</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="profile">Profile URL</option>
                  <option value="company">Company Name</option>
                  <option value="domain">Email Domain</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Paste list of items (One per line)</label>
                <textarea
                  required
                  placeholder="https://linkedin.com/in/prospect-a&#10;https://linkedin.com/in/prospect-b&#10;Google&#10;Netflix, company, competitor"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 text-xs font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-400 font-mono"
                />
                <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase">Format: value [, type, reason]</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? 'Importing...' : 'Import List'}
              </button>
            </form>
          )}

          {/* DNC Info box */}
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 text-slate-500 dark:text-slate-400">
            <ShieldAlert className="text-amber-500 shrink-0" size={16} />
            <div className="text-[10px] font-semibold leading-relaxed">
              <span className="font-extrabold uppercase text-amber-600 block mb-0.5">DNC Guard Active</span>
              Before sending connection requests or running profile enrichment, the automation engine dynamically checks this blacklist. Blacklisted profiles and companies are skipped automatically.
            </div>
          </div>
        </div>

        {/* Blacklist Table panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
          
          {/* Table Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-5 border-b border-slate-100 dark:border-slate-800/80">
            <h2 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Active Blacklist Rules ({filteredEntries.length})</h2>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search values..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-400 w-full sm:w-44"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-400"
              >
                <option value="all">All Types</option>
                <option value="profile">Profile URL</option>
                <option value="company">Company</option>
                <option value="domain">Domain</option>
              </select>
            </div>
          </div>

          {/* Table content */}
          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading rules database...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <Ban size={36} className="text-slate-200 dark:text-slate-800 mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider">No blacklist rules set</p>
              <p className="text-[10px] text-slate-400 mt-1">Configure profile URLs or company names to block them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-450 dark:text-slate-550 font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-850">
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Blacklisted Value</th>
                    <th className="py-4 px-4">Reason / Notes</th>
                    <th className="py-4 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850/40">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 font-semibold text-slate-655 dark:text-slate-350">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                          entry.type === 'profile' ? 'bg-indigo-500/5 text-indigo-550 dark:text-indigo-400 border-indigo-500/10' :
                          entry.type === 'company' ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10' :
                          'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
                        }`}>
                          {entry.type === 'profile' ? 'Profile URL' : entry.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={entry.value}>
                        {entry.value}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 dark:text-slate-550 max-w-xs truncate" title={entry.reason}>
                        {entry.reason || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all"
                          title="Remove Rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
