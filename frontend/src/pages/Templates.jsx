import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Sparkles, Loader, Terminal, Copy } from 'lucide-react';
import axios from 'axios';
import { GlassCard, PageHeader, PrimaryBtn, GhostBtn, EmptyState, LoadingSpinner, PageBg, PageStyle } from '../components/PageShell';
import { AnimatePresence, motion } from 'framer-motion';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTpl, setNewTpl] = useState({ title: '', content: '' });
  const [copied, setCopied] = useState(null);

  async function fetchTemplates() {
    try {
      const res = await axios.get('/api/inbox/canned');
      setTemplates(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!newTpl.title || !newTpl.content) return;
    setSaving(true);
    try {
      await axios.post('/api/inbox/canned', newTpl);
      setNewTpl({ title: '', content: '' });
      setShowAdd(false);
      fetchTemplates();
    } catch (e) { alert('Failed to add template'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return;
    try { await axios.delete(`/api/inbox/canned/${id}`); fetchTemplates(); }
    catch (e) { alert('Failed to delete'); }
  }

  function handleCopy(tpl) {
    navigator.clipboard.writeText(tpl.content);
    setCopied(tpl.id);
    setTimeout(() => setCopied(null), 2000);
  }

  useEffect(() => { fetchTemplates(); }, []);

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={FileText}
        title="Message Templates"
        subtitle="Reusable canned replies for rapid outreach follow-ups"
        accent="text-indigo-400"
        actions={
          <PrimaryBtn onClick={() => setShowAdd(!showAdd)} id="create-template-btn">
            <Plus size={13} strokeWidth={3} />
            {showAdd ? 'Cancel' : 'Create Template'}
          </PrimaryBtn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Total Templates</p>
          <p className="text-2xl font-black text-indigo-400 mt-1">{templates.length}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Avg. Length</p>
          <p className="text-2xl font-black text-blue-400 mt-1">
            {templates.length > 0 ? Math.round(templates.reduce((s,t) => s + t.content.length, 0) / templates.length) : 0} chars
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">With Variables</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{templates.filter(t => t.content.includes('{{name}}')).length}</p>
        </GlassCard>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-6 border-blue-500/20">
              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4">New Template</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Template Name</label>
                  <input
                    value={newTpl.title}
                    onChange={e => setNewTpl({ ...newTpl, title: e.target.value })}
                    placeholder="e.g., Calendar Link Request"
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Message Content</label>
                  <textarea
                    value={newTpl.content}
                    onChange={e => setNewTpl({ ...newTpl, content: e.target.value })}
                    placeholder={`Hi {{name}}, I'd love to connect and share how we've helped similar teams...`}
                    rows={5}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                  />
                  <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg bg-blue-500/8 border border-blue-500/15 w-fit">
                    <Terminal size={10} className="text-blue-400" />
                    <span className="text-[9px] text-blue-400 font-bold">Use {'{{name}}'} to dynamically insert prospect's first name</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleAdd} disabled={saving} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                    {saving ? <Loader size={14} className="animate-spin mx-auto" /> : 'Save Template'}
                  </button>
                  <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/8 transition-all uppercase tracking-wider">
                    Cancel
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Grid */}
      {loading ? (
        <LoadingSpinner text="Loading templates..." />
      ) : templates.length === 0 ? (
        <GlassCard className="py-4">
          <EmptyState icon={Sparkles} title="No templates yet" subtitle="Create quick reply templates to respond to prospects faster." action={<PrimaryBtn onClick={() => setShowAdd(true)}><Plus size={13}/>Create First Template</PrimaryBtn>} />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tpl => (
            <GlassCard key={tpl.id} className="p-5 hover:border-white/15 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                    <FileText size={15} className="text-indigo-400" />
                  </div>
                  <h3 className="font-black text-white text-sm">{tpl.title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleCopy(tpl)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/8 transition-all" title="Copy">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-3 text-xs text-slate-400 leading-relaxed line-clamp-4 whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {tpl.content}
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-[9px] text-slate-600 font-medium">{tpl.content.length} chars</span>
                {copied === tpl.id && <span className="text-[9px] text-emerald-400 font-bold">✓ Copied!</span>}
                {tpl.content.includes('{{name}}') && (
                  <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-lg font-bold">Personalized</span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
