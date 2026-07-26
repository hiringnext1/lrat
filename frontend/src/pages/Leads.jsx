import { useEffect, useState } from 'react';
import { LayoutGrid, Table2, Search, Users, Sparkles, Filter, Megaphone, Download, Upload, Plus } from 'lucide-react';
import axios from 'axios';
import socket from '../socket';
import KanbanBoard from '../components/KanbanBoard';
import LeadTable from '../components/LeadTable';
import LeadDetailModal from '../components/LeadDetailModal';
import ImportModal from '../components/ImportModal';
import { GlassCard, PageHeader, PrimaryBtn, GhostBtn, DarkInput, DarkSelect, PageBg, PageStyle } from '../components/PageShell';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [showScraper, setShowScraper] = useState(false);
  const queryParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState(queryParams.get('campaign_id') || '');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [enrichedFilter, setEnrichedFilter] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  useEffect(() => {
    fetchLeads(); fetchCampaigns(); fetchAccounts();
    const refresh = () => fetchLeads();
    socket.on('leads_updated', refresh);
    return () => socket.off('leads_updated', refresh);
  }, [search, statusFilter, campaignFilter, sentimentFilter, enrichedFilter]);

  async function fetchLeads() {
    try {
      const res = await axios.get('/api/leads', { params: { search, status: statusFilter, campaign_id: campaignFilter, ai_sentiment: sentimentFilter, is_enriched: enrichedFilter, limit: 1000 } });
      setLeads(res.data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchCampaigns() {
    const res = await axios.get('/api/campaigns');
    setCampaigns(res.data.data || []);
  }

  async function fetchAccounts() {
    const res = await axios.get('/api/accounts');
    setAccounts(res.data.data || []);
  }

  async function handleExport() {
    try {
      const res = await axios.get('/api/leads/export', { params: { search, status: statusFilter, campaign_id: campaignFilter }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (e) { alert('Export failed'); }
  }

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  leads.forEach(l => { if (l.ai_sentiment) sentimentCounts[l.ai_sentiment] = (sentimentCounts[l.ai_sentiment] || 0) + 1; });

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={Users}
        title="Prospects CRM"
        subtitle="Review prospect outreach states and communications"
        accent="text-blue-400"
        actions={
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/8 bg-white/4">
              <button onClick={() => setView('kanban')} className={`p-2 rounded-lg transition-all ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Kanban">
                <LayoutGrid size={13} />
              </button>
              <button onClick={() => setView('table')} className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Table">
                <Table2 size={13} />
              </button>
            </div>
            <GhostBtn onClick={handleExport}><Download size={13} />Export CSV</GhostBtn>
            <PrimaryBtn onClick={() => setShowScraper(true)} id="import-leads-btn"><Upload size={13} />Import Leads</PrimaryBtn>
          </div>
        }
      />

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Prospects', val: leads.length, color: 'text-blue-400' },
          { label: '🔥 Hot Leads', val: sentimentCounts.positive, color: 'text-emerald-400' },
          { label: '😐 Neutral', val: sentimentCounts.neutral, color: 'text-amber-400' },
          { label: '❌ Negative', val: sentimentCounts.negative, color: 'text-red-400' },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{val}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              placeholder="Search by name, company, title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DarkSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)} icon={Filter}>
              <option value="">All Status</option>
              <option value="pending_connection">Pending</option>
              <option value="connection_sent">Sent</option>
              <option value="connected">Connected</option>
              <option value="replied">Replied</option>
            </DarkSelect>
            <DarkSelect value={sentimentFilter} onChange={e => setSentimentFilter(e.target.value)} icon={Sparkles}>
              <option value="">Any Sentiment</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </DarkSelect>
            <DarkSelect value={enrichedFilter} onChange={e => setEnrichedFilter(e.target.value)} icon={Users}>
              <option value="">Any Enrichment</option>
              <option value="1">Enriched</option>
              <option value="0">Not Enriched</option>
            </DarkSelect>
            <DarkSelect value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} icon={Megaphone}>
              <option value="">All Campaigns</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </DarkSelect>
          </div>
        </div>
      </GlassCard>

      {/* Main Board */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Loading prospects...</span>
          </div>
        ) : view === 'table' ? (
          <GlassCard className="overflow-hidden">
            <LeadTable leads={leads} onUpdate={fetchLeads} onDelete={fetchLeads} campaigns={campaigns} campaignId={campaignFilter} onLeadClick={setSelectedLeadId} />
          </GlassCard>
        ) : (
          <KanbanBoard leads={leads} onUpdate={fetchLeads} onLeadClick={setSelectedLeadId} />
        )}
      </div>

      {showScraper && <ImportModal onClose={() => setShowScraper(false)} accounts={accounts} campaigns={campaigns} onImported={fetchLeads} />}
      {selectedLeadId && <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} onUpdate={fetchLeads} />}
    </div>
  );
}
