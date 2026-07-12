import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Megaphone, Play, Pause, Trash2, Edit, 
  Users, UserCheck, MessageSquare, Calendar, 
  TrendingUp, Activity, ChevronRight, BarChart3, AlertCircle,
  Upload, Copy
} from 'lucide-react';
import axios from 'axios';
import ImportModal from '../components/ImportModal';

const STATUS_COLORS = {
  draft: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
  active: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
  paused: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
  completed: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
  stalled: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30',
};

function ConversionRate({ label, value, total, color, labelColor }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex-1 min-w-[120px] text-left">
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-extrabold ${labelColor}`}>{percentage}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${color}`} 
          style={{ width: `${percentage}%` }}
        />
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

  async function fetchCampaigns() {
    try {
      const res = await axios.get('/api/campaigns');
      setCampaigns(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccounts() {
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleStatus(e, campaign) {
    e.stopPropagation();
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await axios.put(`/api/campaigns/${campaign.id}/status`, { status: newStatus });
    fetchCampaigns();
  }

  async function deleteCampaign(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this campaign and ALL its associated leads? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/campaigns/${id}`);
      fetchCampaigns();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', title: 'Campaign Deleted', body: 'Campaign and associated leads removed successfully.' } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', title: 'Delete Failed', body: 'Failed to delete campaign.' } }));
    }
  }

  async function duplicateCampaign(id) {
    try {
      const res = await axios.post(`/api/campaigns/${id}/clone`);
      if (res.data?.success) {
        fetchCampaigns();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', title: 'Campaign Duplicated', body: 'A copy of this campaign has been created in drafts.' } }));
      }
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', title: 'Duplication Failed', body: 'Failed to clone this campaign.' } }));
    }
  }

  useEffect(() => { 
    fetchCampaigns(); 
    fetchAccounts();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Widget */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Megaphone className="text-blue-600 dark:text-blue-400" size={28} strokeWidth={2.5} />
            Outreach Campaigns
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Configure visual message flows and target prospect pools</p>
        </div>
        
        <button
          onClick={() => navigate('/dashboard/campaigns/new/build')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* Loading & Empty states */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 relative z-10">
          <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest animate-pulse">Syncing campaign modules...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800/80 p-20 text-center shadow-sm relative z-10">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700/50">
            <Activity size={36} className="text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">No active campaigns</h3>
          <p className="text-xs text-slate-450 dark:text-slate-500 mt-2 max-w-sm mx-auto font-semibold uppercase tracking-wider leading-relaxed">
            Create your first visual automated sequence to target matching prospects.
          </p>
          <button
            onClick={() => navigate('/dashboard/campaigns/new/build')}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            Build First Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative z-10">
          {campaigns.map((campaign) => {
            const isStalled = campaign.is_stalled;
            const statusStyle = isStalled ? STATUS_COLORS.stalled : STATUS_COLORS[campaign.status];
            
            return (
              <div
                key={campaign.id}
                onClick={() => navigate(`/dashboard/leads?campaign_id=${campaign.id}`)}
                className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 cursor-pointer hover:border-slate-200 dark:hover:border-slate-700/80 hover:shadow-xl transition-all duration-300 group relative overflow-hidden flex flex-col justify-between"
              >
                {/* Glow highlight based on status */}
                <div className={`absolute top-0 right-0 w-36 h-36 -mr-16 -mt-16 rounded-full blur-3xl opacity-20 transition-all bg-gradient-to-tr ${
                  isStalled ? 'from-rose-450 to-transparent' : campaign.status === 'active' ? 'from-emerald-450 to-transparent' : 'from-slate-400 to-transparent'
                }`} />

                <div>
                  {/* Top Row: Title, Status and Action Panel */}
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-xl font-black text-slate-850 dark:text-slate-100 truncate tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {campaign.name}
                        </h3>
                        {campaign.status === 'active' && !isStalled && (
                          <span className="flex h-2.5 w-2.5 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-wider border ${statusStyle}`}>
                          {isStalled ? 'Stalled (No Accounts)' : campaign.status}
                        </span>
                        
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
                          <Calendar size={12} className="text-slate-350" /> 
                          {new Date(campaign.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 relative z-20">
                      {isStalled && (
                        <div className="p-2 text-rose-500 animate-bounce" title="No linked account is currently processing this campaign.">
                          <AlertCircle size={18} />
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaignId(campaign.id);
                          setShowScraper(true);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                        title="Import Leads for Campaign"
                      >
                        <Upload size={16} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/campaigns/${campaign.id}/build`);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                        title="Edit Campaign Sequence Flow"
                      >
                        <Edit size={16} />
                      </button>
                      
                      <button
                        onClick={(e) => toggleStatus(e, campaign)}
                        className={`p-2 rounded-xl transition-all border ${
                          campaign.status === 'active' 
                            ? 'bg-amber-50 text-amber-600 border-amber-100/50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100/50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                        }`}
                        title={campaign.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                      >
                        {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateCampaign(campaign.id);
                        }}
                        className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                        title="Duplicate Campaign"
                      >
                        <Copy size={16} />
                      </button>

                      <button
                        onClick={(e) => deleteCampaign(e, campaign.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                        title="Delete Campaign"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Progress Conversion Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 bg-slate-50/50 dark:bg-slate-900/30 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <ConversionRate 
                      label="Acceptance Conversion" 
                      value={campaign.accepted} 
                      total={campaign.connections_sent} 
                      color="bg-purple-500" 
                      labelColor="text-purple-600 dark:text-purple-400"
                    />
                    <ConversionRate 
                      label="Hot Response Conversion" 
                      value={campaign.replied} 
                      total={campaign.accepted} 
                      color="bg-emerald-500" 
                      labelColor="text-emerald-600 dark:text-emerald-400"
                    />
                  </div>

                  {/* Stats Counter List */}
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {[
                      { label: 'Outreach', value: campaign.connections_sent },
                      { label: 'Accepted', value: campaign.accepted },
                      { label: 'Pitch Sent', value: campaign.jd_sent },
                      { label: 'AI Replies', value: campaign.replied },
                    ].map((stat, i) => (
                      <div key={i} className="text-left">
                        <p className="text-lg font-black text-slate-850 dark:text-slate-150 leading-none">{stat.value || 0}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-1.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Details */}
                <div className="pt-4.5 border-t border-slate-50 dark:border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <Users size={14} className="text-blue-500" />
                    <span>{campaign.lead_count || 0} Target Prospects</span>
                  </div>
                  
                  <div className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest group-hover:translate-x-1.5 transition-transform">
                    <span>Manage Pipeline</span>
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
      {showScraper && (
        <ImportModal 
          onClose={() => setShowScraper(false)} 
          accounts={accounts} 
          campaigns={campaigns} 
          defaultCampaignId={selectedCampaignId}
          onImported={fetchCampaigns} 
        />
      )}
    </div>
  );
}
