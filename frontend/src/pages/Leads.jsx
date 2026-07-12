import { useEffect, useState } from 'react';
import { 
  LayoutGrid, Table2, Search, Users, Sparkles, Filter, Megaphone, Download, Upload, Plus 
} from 'lucide-react';
import axios from 'axios';
import socket from '../socket';
import KanbanBoard from '../components/KanbanBoard';
import LeadTable from '../components/LeadTable';
import LeadDetailModal from '../components/LeadDetailModal';
import ImportModal from '../components/ImportModal';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [showScraper, setShowScraper] = useState(false);
  
  // Check for campaign_id in URL query params
  const queryParams = new URLSearchParams(window.location.search);
  const initialCampaign = queryParams.get('campaign_id') || '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState(initialCampaign);
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [enrichedFilter, setEnrichedFilter] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  useEffect(() => {
    fetchLeads();
    fetchCampaigns();
    fetchAccounts();

    const refresh = () => fetchLeads();
    socket.on('leads_updated', refresh);
    return () => socket.off('leads_updated', refresh);
  }, [search, statusFilter, campaignFilter, sentimentFilter, enrichedFilter]);

  async function fetchLeads() {
    try {
      const res = await axios.get('/api/leads', { 
        params: { 
          search, 
          status: statusFilter, 
          campaign_id: campaignFilter, 
          ai_sentiment: sentimentFilter,
          is_enriched: enrichedFilter,
          limit: 1000 
        } 
      });
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
      const params = { search, status: statusFilter, campaign_id: campaignFilter };
      const res = await axios.get('/api/leads/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('Export failed', e);
      alert('Export failed');
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden">
      
      {/* Background ambient glowing mesh */}
      <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-blue-500 to-indigo-500 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-emerald-500 to-teal-500 pointer-events-none" />

      {/* Header View */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Users className="text-blue-600 dark:text-blue-400" size={28} strokeWidth={2.5} />
            Prospects CRM
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Review prospect outreach states and communications</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Layout switcher */}
          <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-1 rounded-2xl shadow-inner">
            <button 
              onClick={() => setView('kanban')} 
              className={`p-2 rounded-xl transition-all ${
                view === 'kanban' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
              }`}
              title="Pipeline View"
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setView('table')} 
              className={`p-2 rounded-xl transition-all ${
                view === 'table' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-650'
              }`}
              title="Database Table"
            >
              <Table2 size={16} />
            </button>
          </div>

          <button 
            onClick={handleExport} 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-305 px-4.5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-850 transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={14} /> 
            <span>Export CSV</span>
          </button>

          <button 
            onClick={() => setShowScraper(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            <Upload size={14} strokeWidth={2.5} />
            <span>Import Leads</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Section */}
      <div className="bg-white dark:bg-slate-900/60 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800/85 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col xl:flex-row items-stretch xl:items-center gap-4 relative z-10">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search prospects by name, company or title..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100/50 dark:border-slate-850 rounded-2xl text-xs focus:ring-4 focus:ring-blue-105/10 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-slate-700 dark:text-slate-205 transition-all font-semibold placeholder:text-slate-400" 
          />
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xl:w-auto w-full">
          {/* Status filter */}
          <div className="bg-slate-50 dark:bg-slate-950/40 px-3.5 py-3 rounded-2xl flex items-center gap-2 border border-slate-100/80 dark:border-slate-850/60 focus-within:ring-4 focus-within:ring-blue-100/20 dark:focus-within:ring-blue-900/10 focus-within:border-blue-550 transition-all">
            <Filter size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-350 cursor-pointer w-full focus:ring-0 p-0"
            >
              <option value="" className="dark:bg-slate-900">All Statuses</option>
              <option value="pending_connection" className="dark:bg-slate-900">Pending</option>
              <option value="connection_sent" className="dark:bg-slate-900">Sent</option>
              <option value="connected" className="dark:bg-slate-900">Connected</option>
              <option value="replied" className="dark:bg-slate-900">Replied</option>
            </select>
          </div>

          {/* AI Sentiment filter */}
          <div className="bg-slate-50 dark:bg-slate-950/40 px-3.5 py-3 rounded-2xl flex items-center gap-2 border border-slate-100/80 dark:border-slate-850/60 focus-within:ring-4 focus-within:ring-blue-100/20 dark:focus-within:ring-blue-900/10 focus-within:border-blue-550 transition-all">
            <Sparkles size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select 
              value={sentimentFilter} 
              onChange={e => setSentimentFilter(e.target.value)} 
              className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-350 cursor-pointer w-full focus:ring-0 p-0"
            >
              <option value="" className="dark:bg-slate-900">Any Sentiment</option>
              <option value="positive" className="dark:bg-slate-900">Positive</option>
              <option value="neutral" className="dark:bg-slate-900">Neutral</option>
              <option value="negative" className="dark:bg-slate-900">Negative</option>
            </select>
          </div>

          {/* AI Enrichment filter */}
          <div className="bg-slate-50 dark:bg-slate-950/40 px-3.5 py-3 rounded-2xl flex items-center gap-2 border border-slate-100/80 dark:border-slate-850/60 focus-within:ring-4 focus-within:ring-blue-100/20 dark:focus-within:ring-blue-900/10 focus-within:border-blue-550 transition-all">
            <Users size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select 
              value={enrichedFilter} 
              onChange={e => setEnrichedFilter(e.target.value)} 
              className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-350 cursor-pointer w-full focus:ring-0 p-0"
            >
              <option value="" className="dark:bg-slate-900">Any Enrichment</option>
              <option value="1" className="dark:bg-slate-900">Enriched</option>
              <option value="0" className="dark:bg-slate-900">Not Enriched</option>
            </select>
          </div>

          {/* Campaign Filter */}
          <div className="bg-slate-50 dark:bg-slate-950/40 px-3.5 py-3 rounded-2xl flex items-center gap-2 border border-slate-100/80 dark:border-slate-850/60 focus-within:ring-4 focus-within:ring-blue-100/20 dark:focus-within:ring-blue-900/10 focus-within:border-blue-550 transition-all">
            <Megaphone size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select 
              value={campaignFilter} 
              onChange={e => setCampaignFilter(e.target.value)} 
              className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-slate-650 dark:text-slate-350 cursor-pointer w-full focus:ring-0 p-0 truncate max-w-[140px]"
            >
              <option value="" className="dark:bg-slate-900">All Campaigns</option>
              {campaigns.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Board Canvas */}
      <div className="relative min-h-[500px] z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 animate-pulse">Filtering active database...</p>
          </div>
        ) : view === 'table' ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-md overflow-hidden">
            <LeadTable 
              leads={leads} 
              onUpdate={fetchLeads} 
              onDelete={fetchLeads} 
              campaigns={campaigns} 
              campaignId={campaignFilter} 
              onLeadClick={setSelectedLeadId} 
            />
          </div>
        ) : (
          <div className="bg-transparent pb-10">
            <KanbanBoard 
              leads={leads} 
              onUpdate={fetchLeads} 
              onLeadClick={setSelectedLeadId} 
            />
          </div>
        )}
      </div>

      {/* Sub Modals */}
      {showScraper && (
        <ImportModal 
          onClose={() => setShowScraper(false)} 
          accounts={accounts} 
          campaigns={campaigns} 
          onImported={fetchLeads} 
        />
      )}
      
      {selectedLeadId && (
        <LeadDetailModal 
          leadId={selectedLeadId} 
          onClose={() => setSelectedLeadId(null)} 
          onUpdate={fetchLeads} 
        />
      )}
    </div>
  );
}
