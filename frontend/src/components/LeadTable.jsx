import { useState } from 'react';
import { ExternalLink, Trash2, CheckCircle, Download } from 'lucide-react';
import axios from 'axios';

const STATUS_LABELS = {
  pending_connection: { label: 'Pending', color: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800' },
  connection_sent: { label: 'Req. Sent', color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20' },
  connected: { label: 'Connected', color: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/20' },
  jd_sent: { label: 'Pitch Sent', color: 'bg-purple-50 text-purple-600 border-purple-100/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20' },
  follow_up_sent: { label: 'Follow-up', color: 'bg-amber-50 text-amber-600 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20' },
  replied: { label: 'Replied', color: 'bg-emerald-50 text-emerald-650 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/20' },
  shortlisted: { label: 'Qualified', color: 'bg-green-50 text-green-600 border-green-100/50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/20' },
  not_interested: { label: 'Excluded', color: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/20' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-slate-50 text-slate-500 border-slate-100' };
  return <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border ${s.color}`}>{s.label}</span>;
}

export default function LeadTable({ leads, onUpdate, onDelete, campaigns, campaignId, onLeadClick }) {
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkCampaign, setBulkCampaign] = useState('');
  const [bulkTag, setBulkTag] = useState('');

  function toggleSelect(e, id) {
    e.stopPropagation();
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id));
  }

  async function applyBulkUpdate() {
    if (selected.length === 0) return;
    const count = selected.length;
    try {
      await axios.post('/api/leads/bulk-update', {
        ids: selected,
        status: bulkStatus || undefined,
        campaign_id: bulkCampaign || undefined,
      });
      onUpdate?.();
      setSelected([]);
      setBulkStatus('');
      setBulkCampaign('');
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', title: 'Bulk Update Success', body: `Successfully updated ${count} prospects.` } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', title: 'Update Failed', body: 'Failed to apply bulk update.' } }));
    }
  }

  async function applyBulkTag(action) {
    if (selected.length === 0 || !bulkTag.trim()) return;
    const count = selected.length;
    try {
      await axios.post('/api/leads/bulk-update', {
        ids: selected,
        action,
        tag: bulkTag.trim()
      });
      onUpdate?.();
      setSelected([]);
      setBulkTag('');
      const actionText = action === 'add_tag' ? 'added tag to' : 'removed tag from';
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', title: 'Tag Update Success', body: `Successfully ${actionText} ${count} prospects.` } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', title: 'Tag Update Failed', body: 'Failed to update tags on prospects.' } }));
    }
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selected.length} prospects?`)) return;
    const count = selected.length;
    try {
      await axios.post('/api/leads/bulk-update', {
        ids: selected,
        action: 'delete'
      });
      onUpdate?.();
      setSelected([]);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', title: 'Prospects Deleted', body: `Successfully removed ${count} selected prospects.` } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', title: 'Delete Failed', body: 'Failed to delete prospects.' } }));
    }
  }

  function exportCSV() {
    const token = localStorage.getItem('lrat_token');
    const params = campaignId ? `?campaign_id=${campaignId}&token=${token}` : `?token=${token}`;
    window.open(`/api/leads/export${params}`, '_blank');
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden text-left">
      {selected.length > 0 && (
        <div className="px-5 py-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-4 flex-wrap">
          <span className="text-xs text-blue-755 dark:text-blue-400 font-extrabold uppercase tracking-wider">{selected.length} items selected</span>
          <div className="h-4 w-px bg-blue-200 dark:bg-blue-800/80 mx-1" />
          
          <div className="flex items-center gap-2">
            <select 
              value={bulkStatus} 
              onChange={(e) => setBulkStatus(e.target.value)}
              className="text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-705 dark:text-slate-300 outline-none"
            >
              <option value="">Change status…</option>
              {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
            </select>
            
            <select 
              value={bulkCampaign} 
              onChange={(e) => setBulkCampaign(e.target.value)}
              className="text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-750 dark:text-slate-300 outline-none"
            >
              <option value="">Move to campaign…</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-0.5 bg-white dark:bg-slate-800">
              <input
                type="text"
                placeholder="Tag name..."
                value={bulkTag}
                onChange={(e) => setBulkTag(e.target.value)}
                className="text-[10px] font-semibold border-none bg-transparent outline-none w-20 px-1 py-1 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-0"
              />
              {bulkTag.trim() && (
                <div className="flex gap-1">
                  <button
                    onClick={() => applyBulkTag('add_tag')}
                    className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg font-black uppercase tracking-wider"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => applyBulkTag('remove_tag')}
                    className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded-lg font-black uppercase tracking-wider"
                  >
                    Rem
                  </button>
                </div>
              )}
            </div>
            
            {(bulkStatus || bulkCampaign) && (
              <button 
                onClick={applyBulkUpdate} 
                className="text-[9px] bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-black uppercase tracking-widest transition-all"
              >
                Apply
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-blue-200 dark:bg-blue-800/80 mx-1" />
          
          <button 
            onClick={bulkDelete} 
            className="text-[10px] text-rose-600 dark:text-rose-450 hover:text-rose-700 font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Trash2 size={13} /> 
            <span>Delete Selected</span>
          </button>
          
          <button 
            onClick={exportCSV} 
            className="ml-auto text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <Download size={13} /> 
            <span>Export Selected</span>
          </button>
        </div>
      )}

      {leads.length === 0 ? (
        <div className="p-16 text-center">
          <p className="text-slate-455 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">No matching prospects detected</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-1 uppercase tracking-wider">Configure search settings or upload CSV to import.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
              <tr>
                <th className="px-5 py-3.5 text-left w-12">
                  <input 
                    type="checkbox" 
                    checked={selected.length === leads.length && leads.length > 0} 
                    onChange={toggleAll} 
                    className="rounded text-blue-600 focus:ring-0" 
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest">Prospect Profile</th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest">Target Company</th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest">Prospect Fit index</th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Pipeline State</th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Last View Action</th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">AI Sentiment</th>
                <th className="px-5 py-3.5 text-left text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest w-20">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
              {leads.map((lead) => (
                <tr 
                  key={lead.id} 
                  onClick={() => onLeadClick?.(lead.id)}
                  className={`cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-900/35 transition-all ${
                    selected.includes(lead.id) ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                  }`}
                >
                  <td className="px-5 py-4">
                    <input 
                      type="checkbox" 
                      checked={selected.includes(lead.id)} 
                      onChange={(e) => toggleSelect(e, lead.id)} 
                      onClick={(e) => e.stopPropagation()}
                      className="rounded text-blue-600 focus:ring-0" 
                    />
                  </td>
                  
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-100 dark:border-slate-700">
                        {lead.profile_photo_url ? (
                          <img src={lead.profile_photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-405 dark:text-slate-500 text-[9px] font-black uppercase">
                            {lead.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 dark:text-slate-150 leading-tight">{lead.full_name}</p>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate max-w-[200px] mt-0.5">{lead.designation || 'Prospect'}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-350 font-semibold">{lead.company || '—'}</td>
                  
                  <td className="px-5 py-4">
                    {lead.fit_score > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${lead.fit_score >= 80 ? 'bg-emerald-500' : lead.fit_score >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        <span className="font-extrabold text-slate-750 dark:text-slate-205">{lead.fit_score}%</span>
                      </div>
                    ) : (
                      <span className="text-slate-350 dark:text-slate-600 text-[10px] italic font-semibold">Queueing...</span>
                    )}
                  </td>
                  
                  <td className="px-5 py-4"><StatusBadge status={lead.status} /></td>
                  
                  <td className="px-5 py-4">
                    {lead.profile_viewed_at ? (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                        <CheckCircle size={10} className="text-blue-500" strokeWidth={2.5} />
                        <span>{new Date(lead.profile_viewed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-[10px] font-semibold">Pending</span>
                    )}
                  </td>
                  
                  <td className="px-5 py-4">
                    {lead.reply_received ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-450 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle size={11} strokeWidth={2.5} /> 
                        <span>Replied</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-650 text-xs">—</span>
                    )}
                  </td>
                  
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {lead.linkedin_url && (
                        <a 
                          href={lead.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      
                      <button 
                        onClick={() => { 
                          if (window.confirm('Delete this prospect?')) { 
                            axios.delete(`/api/leads/${lead.id}`).then(() => onDelete?.(lead.id)); 
                          } 
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
