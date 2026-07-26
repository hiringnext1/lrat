import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone, Play, Pause, Trash2, Edit, Users, ChevronRight, AlertCircle, Upload, Copy, Activity } from 'lucide-react';
import axios from 'axios';
import ImportModal from '../components/ImportModal';
import { GlassCard, PageHeader, PrimaryBtn, GhostBtn, StatusBadge, EmptyState, LoadingSpinner, PageBg, PageStyle } from '../components/PageShell';

function ConversionBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-slate-500 font-bold uppercase tracking-wider">{label}</span>
        <span className="font-black" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScraper, setShowScraper] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [filter, setFilter] = useState('all');

  async function fetchCampaigns() {
    try {
      const res = await axios.get('/api/campaigns');
      setCampaigns(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchAccounts() {
    const res = await axios.get('/api/accounts');
    setAccounts(res.data.data || []);
  }

  async function toggleStatus(e, campaign) {
    e.stopPropagation();
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await axios.put(`/api/campaigns/${campaign.id}/status`, { status: newStatus });
    fetchCampaigns();
  }

  async function deleteCampaign(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this campaign and ALL its leads? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/campaigns/${id}`);
      fetchCampaigns();
    } catch (e) { console.error(e); }
  }

  async function duplicateCampaign(e, id) {
    e.stopPropagation();
    try {
      const res = await axios.post(`/api/campaigns/${id}/clone`);
      if (res.data?.success) fetchCampaigns();
    } catch (e) { console.error(e); }
  }

  useEffect(() => { fetchCampaigns(); fetchAccounts(); }, []);

  const filters = ['all', 'active', 'paused', 'draft', 'completed'];
  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  const activeCnt = campaigns.filter(c => c.status === 'active').length;
  const totalSent = campaigns.reduce((s, c) => s + (c.connections_sent || 0), 0);

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={Megaphone}
        title="Campaigns"
        subtitle="Configure automated outreach sequences"
        accent="text-blue-400"
        actions={
          <PrimaryBtn onClick={() => navigate('/dashboard/campaigns/new/build')} id="create-campaign-btn">
            <Plus size={13} strokeWidth={3} /> Create Campaign
          </PrimaryBtn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', val: campaigns.length, color: 'text-blue-400' },
          { label: 'Active', val: activeCnt, color: 'text-emerald-400' },
          { label: 'Total Sent', val: totalSent.toLocaleString(), color: 'text-purple-400' },
          { label: 'Avg. Accept Rate', val: campaigns.length > 0 ? Math.round(campaigns.reduce((s,c)=>s+(c.accepted||0),0)/Math.max(campaigns.reduce((s,c)=>s+(c.connections_sent||0),0),1)*100)+'%' : '0%', color: 'text-amber-400' },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{val}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
              filter === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-white/8 bg-white/4 text-slate-500 hover:text-white hover:bg-white/8'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-[9px] text-slate-600 font-bold ml-2">{filtered.length} campaigns</span>
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <LoadingSpinner text="Loading campaigns..." />
      ) : filtered.length === 0 ? (
        <GlassCard className="py-4">
          <EmptyState
            icon={Activity}
            title="No campaigns found"
            subtitle="Create your first automated LinkedIn outreach campaign."
            action={<PrimaryBtn onClick={() => navigate('/dashboard/campaigns/new/build')}><Plus size={13}/>Build First Campaign</PrimaryBtn>}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(campaign => {
            const isStalled = campaign.is_stalled;
            return (
              <GlassCard
                key={campaign.id}
                className="p-5 cursor-pointer hover:border-white/15 transition-all group"
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                {/* Status glow */}
                <div className="absolute top-0 right-0 w-40 h-40 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 pointer-events-none"
                  style={{ background: isStalled ? '#ef4444' : campaign.status === 'active' ? '#10b981' : '#475569' }}
                />

                <div onClick={() => navigate(`/dashboard/leads?campaign_id=${campaign.id}`)}>
                  {/* Top: Name + Status + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-black text-white truncate group-hover:text-blue-400 transition-colors">{campaign.name}</h3>
                        {campaign.status === 'active' && !isStalled && (
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={isStalled ? 'stalled' : campaign.status} />
                        <span className="text-[9px] text-slate-600 font-medium">
                          {new Date(campaign.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 relative z-20" onClick={e => e.stopPropagation()}>
                      {isStalled && <AlertCircle size={15} className="text-red-400 animate-bounce mr-1" />}
                      <button onClick={e => { e.stopPropagation(); setSelectedCampaignId(campaign.id); setShowScraper(true); }} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-white/8 transition-all" title="Import Leads"><Upload size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); navigate(`/dashboard/campaigns/${campaign.id}/build`); }} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/8 transition-all" title="Edit"><Edit size={13} /></button>
                      <button onClick={e => toggleStatus(e, campaign)} className={`p-1.5 rounded-lg transition-all ${campaign.status === 'active' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title="Toggle">
                        {campaign.status === 'active' ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                      </button>
                      <button onClick={e => duplicateCampaign(e, campaign.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-white/8 transition-all" title="Duplicate"><Copy size={13} /></button>
                      <button onClick={e => deleteCampaign(e, campaign.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {/* Conversion Bars */}
                  <div className="space-y-3 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <ConversionBar label="Acceptance Rate" value={campaign.accepted} total={campaign.connections_sent} color="#10b981" />
                    <ConversionBar label="Reply Rate" value={campaign.replied} total={campaign.accepted} color="#a78bfa" />
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Sent', val: campaign.connections_sent || 0 },
                      { label: 'Accepted', val: campaign.accepted || 0 },
                      { label: 'Pitched', val: campaign.jd_sent || 0 },
                      { label: 'Replied', val: campaign.replied || 0 },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="text-lg font-black text-white">{s.val}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/6">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Users size={11} className="text-blue-400" />
                      {campaign.lead_count || 0} prospects
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 font-black group-hover:translate-x-1 transition-transform">
                      Manage Pipeline <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {showScraper && (
        <ImportModal onClose={() => setShowScraper(false)} accounts={accounts} campaigns={campaigns} defaultCampaignId={selectedCampaignId} onImported={fetchCampaigns} />
      )}
    </div>
  );
}
