import { useEffect, useState, useRef } from 'react';
import { 
  X, AlertCircle, CheckCircle2, Upload, FileText, Globe, ArrowRight, Loader, Database, Sparkles 
} from 'lucide-react';
import axios from 'axios';

export default function ImportModal({ onClose, accounts, campaigns, onImported, defaultCampaignId }) {
  const [mode, setMode] = useState(null); // 'url' or 'csv'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // URL Mode State
  const [url, setUrl] = useState('');
  const [accountId, setAccountId] = useState('');
  const [campaignId, setCampaignId] = useState(defaultCampaignId || '');
  const [maxLeads, setMaxLeads] = useState(100);
  const [preview, setPreview] = useState([]);
  const [totalFound, setTotalFound] = useState(0);

  // CSV Mode State
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    full_name: '',
    linkedin_url: '',
    company: '',
    designation: '',
    location: ''
  });

  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    
    // Parse headers for mapping
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
      setCsvHeaders(headers);
      
      // Auto-map based on common names
      const newMap = { ...mapping };
      headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('name')) newMap.full_name = h;
        if (lower.includes('url') || lower.includes('linkedin')) newMap.linkedin_url = h;
        if (lower.includes('company')) newMap.company = h;
        if (lower.includes('title') || lower.includes('designation')) newMap.designation = h;
        if (lower.includes('location') || lower.includes('city')) newMap.location = h;
      });
      setMapping(newMap);
      setStep(2);
    };
    reader.readAsText(f.slice(0, 5000)); // Read just the beginning
  }

  async function fetchUrlPreview() {
    if (!url.trim()) return setError('Paste a LinkedIn search URL first');
    if (!accountId) return setError('Select a LinkedIn account to use');
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/leads/import/preview', { search_url: url, account_id: accountId });
      setPreview(res.data.data || []);
      setTotalFound(res.data.total_found || 0);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to fetch — check URL and account');
    } finally {
      setLoading(false);
    }
  }

  async function startImport() {
    if (!campaignId) return setError('Select a campaign first');
    setError('');
    setLoading(true);
    try {
      if (mode === 'url') {
        await axios.post('/api/leads/import/url', {
          search_url: url,
          account_id: accountId,
          campaign_id: campaignId,
          max_leads: maxLeads,
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('campaign_id', campaignId);
        formData.append('mapping', JSON.stringify(mapping));
        await axios.post('/api/leads/import/csv', formData);
      }
      setStep(3);
      onImported?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 text-left relative">
        
        {/* Glow ambient background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-850 dark:text-slate-150 tracking-tight uppercase">Import Leads CRM</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Feed prospects into outreach pipelines</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!mode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8">
              
              <button 
                onClick={() => setMode('url')}
                className="flex flex-col items-center gap-4 p-8 rounded-[28px] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-550 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all group text-center"
              >
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Globe size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm uppercase tracking-wider">LinkedIn People Search</h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-1 uppercase tracking-wide">Scrape query results directly</p>
                </div>
              </button>

              <button 
                onClick={() => setMode('csv')}
                className="flex flex-col items-center gap-4 p-8 rounded-[28px] border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-550 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all group text-center"
              >
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-450 group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm uppercase tracking-wider">CSV/Excel Importer</h3>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium mt-1 uppercase tracking-wide">Sync custom profile directories</p>
                </div>
              </button>

            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Steps status indicator */}
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50 dark:border-slate-850/60">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border ${
                      step > s 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : step === s 
                          ? 'bg-blue-650 border-blue-650 text-white shadow-md shadow-blue-500/20' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}>
                      {step > s ? <CheckCircle2 size={13} strokeWidth={2.5} /> : s}
                    </div>
                    {s < 3 && <div className={`h-0.5 w-6 rounded-full ${step > s ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />}
                  </div>
                ))}
                <span className="ml-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {step === 1 ? 'Configure Import Settings' : step === 2 ? 'Verify Mapping Layout' : 'Success status'}
                </span>
              </div>

              {/* Step 1: Config Parameters */}
              {step === 1 && (
                <div className="space-y-4">
                  {mode === 'url' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">LinkedIn People Search Link</label>
                        <input 
                          value={url} 
                          onChange={e => setUrl(e.target.value)}
                          placeholder="Paste search URL (e.g., https://www.linkedin.com/search/results/people/?keywords=...)"
                          className="w-full bg-slate-50 dark:bg-slate-950/40 border border-transparent dark:border-slate-950 rounded-2xl px-4 py-3 text-xs font-semibold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-350"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">LinkedIn Account Node</label>
                          <select 
                            value={accountId} 
                            onChange={e => setAccountId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950/40 border border-transparent dark:border-slate-950 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-200 transition-all"
                          >
                            <option value="">Select account...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Max Prospects</label>
                          <input 
                            type="number" 
                            value={maxLeads} 
                            onChange={e => setMaxLeads(parseInt(e.target.value) || '')}
                            className="w-full bg-slate-50 dark:bg-slate-950/40 border border-transparent dark:border-slate-950 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-200 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[28px] p-12 text-center hover:border-blue-500 dark:hover:border-blue-600 hover:bg-blue-50/10 dark:hover:bg-slate-900/40 transition-all cursor-pointer group"
                      >
                        <Upload size={32} className="mx-auto text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors mb-3" />
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Upload CSV File</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-wide">Drag & drop or browse your local files</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                      </div>
                      
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-4.5 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                        <AlertCircle className="text-amber-550 shrink-0" size={16} />
                        <p className="text-[10px] text-amber-750 dark:text-amber-400 leading-relaxed font-semibold uppercase tracking-wide">
                          Ensure the CSV includes a <span className="underline font-black text-amber-800 dark:text-amber-305">LinkedIn Profile Link</span> column to run messaging automations correctly.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Mapping Form */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-slate-50 dark:bg-slate-950/45 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 flex justify-between items-center gap-4">
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Target Campaign sequence</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase mt-0.5 tracking-wide">Link imported prospects directly</p>
                    </div>
                    <select 
                      value={campaignId} 
                      onChange={e => setCampaignId(e.target.value)}
                      className="text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 outline-none shadow-sm cursor-pointer"
                    >
                      <option value="">Select campaign...</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {mode === 'url' ? (
                    <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                      <div className="px-4.5 py-2.5 bg-slate-50 dark:bg-slate-850/60 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        Prospect Previews ({preview.length} profiles)
                      </div>
                      
                      <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-60 overflow-y-auto bg-white dark:bg-slate-900/30">
                        {preview.map((p, i) => (
                          <div key={i} className={`flex items-center justify-between px-4.5 py-3 ${p.is_duplicate ? 'opacity-40' : ''}`}>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-250 truncate">{p.full_name}</p>
                            {p.is_duplicate ? (
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-105 dark:bg-slate-800 px-2 py-0.5 rounded-md">In CRM</span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-100/50 dark:border-emerald-900/30">New node</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-850/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Match CSV Fields to CRM Fields
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: 'Full Name', key: 'full_name' },
                          { label: 'LinkedIn URL', key: 'linkedin_url' },
                          { label: 'Company Name', key: 'company' },
                          { label: 'Designation / Title', key: 'designation' },
                          { label: 'Location / City', key: 'location' }
                        ].map(field => (
                          <div key={field.key}>
                            <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{field.label}</label>
                            <select 
                              value={mapping[field.key]} 
                              onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-slate-950/40 border border-transparent dark:border-slate-950 rounded-xl px-3 py-2 text-xs font-bold focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-200 transition-all"
                            >
                              <option value="">Ignore column</option>
                              {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Success Confirmation */}
              {step === 3 && (
                <div className="text-center py-10 space-y-4 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto border-4 border-white dark:border-slate-800 shadow-xl shadow-emerald-500/10">
                    <Sparkles size={32} className="text-emerald-555" />
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-850 dark:text-slate-150 tracking-tight uppercase">Bulk Sync Initiated!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed uppercase">
                    {mode === 'url' 
                      ? "Search results are being fetched asynchronously. Check your CRM list momentarily."
                      : "Prospect records have been queued. Duplicate records are skipped automatically."
                    }
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex gap-3 text-rose-600 dark:text-rose-450 items-center animate-shake">
                  <AlertCircle size={16} />
                  <p className="text-xs font-black uppercase tracking-wide">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 flex justify-between items-center shrink-0">
          {mode && step < 3 ? (
            <>
              <button 
                onClick={() => step === 1 ? setMode(null) : setStep(1)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back
              </button>
              
              <button 
                onClick={step === 1 && mode === 'url' ? fetchUrlPreview : startImport}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader size={14} className="animate-spin" /> : (
                  <>
                    <span>{step === 1 && mode === 'url' ? 'Generate preview' : 'Confirm Import'}</span>
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </>
          ) : step === 3 ? (
            <button 
              onClick={onClose} 
              className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95"
            >
              Done & Close
            </button>
          ) : (
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mx-auto flex items-center gap-1.5">
              <Database size={12} /> 
              <span>Secure pipeline synchronization</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
