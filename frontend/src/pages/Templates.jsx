import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Sparkles, Loader, Terminal } from 'lucide-react';
import axios from 'axios';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTpl, setNewTpl] = useState({ title: '', content: '' });

  async function fetchTemplates() {
    try {
      const res = await axios.get('/api/inbox/canned');
      setTemplates(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newTpl.title || !newTpl.content) return;
    setSaving(true);
    try {
      await axios.post('/api/inbox/canned', newTpl);
      setNewTpl({ title: '', content: '' });
      setShowAdd(false);
      fetchTemplates();
    } catch (e) {
      alert('Failed to add template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return;
    try {
      await axios.delete(`/api/inbox/canned/${id}`);
      fetchTemplates();
    } catch (e) {
      alert('Failed to delete template');
    }
  }

  useEffect(() => { fetchTemplates(); }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden pb-20">
      
      {/* Background ambient glowing mesh */}
      <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-indigo-500 to-purple-500 pointer-events-none" />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <FileText className="text-blue-650 dark:text-blue-400" size={28} strokeWidth={2.5} />
            Quick Response Templates
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider font-semibold">Build reusable canned messages for rapid outreach follow-ups</p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 active:scale-95 shrink-0"
        >
          <Plus size={14} strokeWidth={2.5} /> 
          <span>Create Canned Reply</span>
        </button>
      </div>

      {/* Creator Form block */}
      {showAdd && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/50 shadow-xl animate-in fade-in slide-in-from-top-4 relative z-10 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Template Title Reference</label>
              <input
                value={newTpl.title}
                onChange={e => setNewTpl({ ...newTpl, title: e.target.value })}
                placeholder="e.g., Request Prospect Calendar Link"
                className="w-full bg-slate-50 dark:bg-slate-950/40 border border-transparent dark:border-slate-950 rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-blue-105/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-205 transition-all placeholder:text-slate-355"
              />
            </div>
            
            <div>
              <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Message Content</label>
              <textarea
                value={newTpl.content}
                onChange={e => setNewTpl({ ...newTpl, content: e.target.value })}
                placeholder="Hi {{name}}, standard outreach template details..."
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-950/40 border border-transparent dark:border-slate-950 rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-blue-105/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-205 transition-all resize-none placeholder:text-slate-355"
              />
              
              <div className="flex items-center gap-1.5 mt-2 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-100/50 dark:border-blue-900/30 text-[9px] font-bold uppercase tracking-wider text-blue-750 dark:text-blue-400 w-fit">
                <Terminal size={10} />
                <span>Use {"{{name}}"} to dynamically insert the prospect's first name</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader size={14} className="animate-spin mx-auto" /> : 'Save Template'}
              </button>
              
              <button
                onClick={() => setShowAdd(false)}
                className="px-6 py-3.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-850 rounded-2xl text-xs font-black uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-3 border-blue-650 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Syncing canned replies...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-750 rounded-2xl flex items-center justify-center mx-auto mb-5 text-slate-400">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-855 dark:text-slate-150 uppercase tracking-wider">No Canned Templates Found</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto font-bold uppercase tracking-wider leading-relaxed">
              Create quick replies to respond to prospect queries in seconds.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((tpl) => (
              <div 
                key={tpl.id} 
                className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-[0_4px_15px_rgb(0,0,0,0.002)] hover:border-slate-250 dark:hover:border-slate-700 transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4.5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 rounded-xl flex items-center justify-center text-blue-650 dark:text-blue-400">
                      <FileText size={18} />
                    </div>
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm">{tpl.title}</h3>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold line-clamp-4 whitespace-pre-wrap">{tpl.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
