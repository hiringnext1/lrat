import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, X, Loader2, RefreshCw } from 'lucide-react';
import socket from '../socket';
import axios from 'axios';

export default function SourcingTracker() {
  const [jobs, setJobs] = useState([]);
  const [dismissedJobIds, setDismissedJobIds] = useState([]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/api/leads/import/jobs');
      if (res.data?.success) {
        setJobs(res.data.data);
      }
    } catch (err) {
      console.error('[SourcingTracker] Failed to fetch import jobs:', err);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Setup socket listeners
    const handleUpdate = (data) => {
      // data: { campaign_id, job_id, new_leads_count, total_so_far, status }
      setJobs((prevJobs) => {
        const index = prevJobs.findIndex((j) => j.id === data.job_id);
        if (index > -1) {
          const updated = [...prevJobs];
          updated[index] = {
            ...updated[index],
            total_imported: data.total_so_far ?? updated[index].total_imported,
            status: data.status,
            updated_at: new Date().toISOString()
          };
          return updated;
        } else {
          // New background job detected, refetch to get campaign name etc.
          fetchJobs();
          return prevJobs;
        }
      });
    };

    const handleError = (data) => {
      // data: { campaign_id, job_id, error }
      setJobs((prevJobs) => {
        const index = prevJobs.findIndex((j) => j.id === data.job_id);
        if (index > -1) {
          const updated = [...prevJobs];
          updated[index] = {
            ...updated[index],
            status: 'failed',
            error_message: data.error,
            updated_at: new Date().toISOString()
          };
          return updated;
        }
        return prevJobs;
      });
    };

    socket.on('leads_updated', handleUpdate);
    socket.on('import_error', handleError);

    return () => {
      socket.off('leads_updated', handleUpdate);
      socket.off('import_error', handleError);
    };
  }, []);

  // Set up auto-dismiss for completed or failed jobs
  useEffect(() => {
    jobs.forEach((job) => {
      if ((job.status === 'completed' || job.status === 'failed') && !dismissedJobIds.includes(job.id)) {
        const timer = setTimeout(() => {
          setDismissedJobIds((prev) => [...prev, job.id]);
        }, 10000);
        return () => clearTimeout(timer);
      }
    });
  }, [jobs, dismissedJobIds]);

  const handleDismiss = (id) => {
    setDismissedJobIds((prev) => [...prev, id]);
  };

  const visibleJobs = jobs.filter((job) => {
    if (job.status === 'processing') return true;
    return !dismissedJobIds.includes(job.id);
  });

  if (visibleJobs.length === 0) return null;

  return (
    <div className="px-3 py-4 border-t border-gray-800/80 bg-gray-900/40 dark:bg-slate-950/40 space-y-3 font-sans">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <RefreshCw size={10} className="animate-spin text-blue-500" />
          Active Sourcing
        </span>
        <span className="text-[9px] bg-blue-500/10 text-blue-400 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
          {visibleJobs.length} {visibleJobs.length === 1 ? 'Job' : 'Jobs'}
        </span>
      </div>

      <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {visibleJobs.map((job) => {
          const progressPercent = Math.min(100, Math.round((job.total_imported / 200) * 100));
          const isProcessing = job.status === 'processing';
          const isCompleted = job.status === 'completed';
          const isFailed = job.status === 'failed';

          return (
            <div 
              key={job.id} 
              className="relative p-3 rounded-2xl bg-white/[0.03] dark:bg-white/[0.02] border border-white/[0.05] shadow-lg flex flex-col gap-2 overflow-hidden transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.05]"
            >
              {/* Dismiss Button */}
              {!isProcessing && (
                <button
                  onClick={() => handleDismiss(job.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={12} />
                </button>
              )}

              {/* Title & Status */}
              <div className="pr-5">
                <p className="text-[11px] font-bold text-gray-200 truncate" title={job.campaign_name}>
                  {job.campaign_name}
                </p>
                <p className="text-[9px] text-gray-500 truncate mt-0.5" title={job.search_url}>
                  {job.search_url}
                </p>
              </div>

              {/* Stats & Progress Indicator */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold">
                <span className="flex items-center gap-1">
                  {isProcessing && <Loader2 size={12} className="animate-spin text-blue-500" />}
                  {isCompleted && <CheckCircle size={12} className="text-green-500" />}
                  {isFailed && <AlertTriangle size={12} className="text-red-500" />}
                  <span className={`capitalize ${isCompleted ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-blue-400'}`}>
                    {job.status}
                  </span>
                </span>
                <span>{job.total_imported} / 200</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
                    isFailed ? 'bg-gradient-to-r from-red-500 to-rose-600' : 
                    'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Error Message if Failed */}
              {isFailed && job.error_message && (
                <p className="text-[9px] text-red-400 leading-normal bg-red-950/20 border border-red-900/30 p-1.5 rounded-lg mt-0.5">
                  {job.error_message}
                </p>
              )}

              {/* Auto dismissal helper note */}
              {!isProcessing && (
                <span className="text-[8px] text-gray-600 dark:text-gray-500 text-right block italic select-none">
                  Closing in a few seconds...
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
