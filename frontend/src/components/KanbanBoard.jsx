import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { User, MessageSquare, Clock } from 'lucide-react';
import axios from 'axios';

const COLUMNS = [
  { id: 'pending_connection', label: 'Pending', color: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800' },
  { id: 'connection_sent', label: 'Req. Sent', color: 'bg-blue-50/50 text-blue-600 border-blue-100/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20' },
  { id: 'connected', label: 'Connected', color: 'bg-indigo-50/50 text-indigo-600 border-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/20' },
  { id: 'jd_sent', label: 'Pitch Sent', color: 'bg-purple-50/50 text-purple-600 border-purple-100/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20' },
  { id: 'follow_up_sent', label: 'Follow-up', color: 'bg-amber-50/50 text-amber-600 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20' },
  { id: 'replied', label: 'Replied', color: 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20' },
  { id: 'shortlisted', label: 'Qualified', color: 'bg-green-50/50 text-green-600 border-green-100/50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/20' },
  { id: 'not_interested', label: 'Excluded', color: 'bg-rose-50/50 text-rose-600 border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/20' },
];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return diff >= 0 ? diff : 0;
}


function shortAgo(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return null;
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function shortUntil(iso) {
  if (!iso) return null;
  const mins = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000);
  if (!Number.isFinite(mins)) return null;
  if (mins <= 0) return 'due';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/** What the engine is doing with this lead right now. */
function StepBadge({ step }) {
  if (!step) return null;

  if (step.state === 'waiting_acceptance') {
    const since = shortAgo(step.since);
    return (
      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30" title="Invite sent, waiting for them to accept">
        <Clock size={9} strokeWidth={2.5} />
        <span>Awaiting {since ? `· ${since}` : ''}</span>
      </div>
    );
  }

  if (step.state === 'waiting_delay') {
    const left = shortUntil(step.until);
    return (
      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30" title={step.next ? `Next: ${step.next}` : 'Waiting'}>
        <Clock size={9} strokeWidth={2.5} />
        <span>{step.next || 'Next'}{left ? ` · ${left}` : ''}</span>
      </div>
    );
  }

  if (step.state === 'ready' && step.label) {
    return (
      <div className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800" title="Queued — waiting for this account's next slot">
        Next: {step.label}
      </div>
    );
  }

  return null;
}

function LeadCard({ lead, index, onClick }) {
  const lastAction = lead.follow_up_1_sent_at || lead.jd_sent_at || lead.accepted_at || lead.connection_sent_at || lead.created_at;
  const days = daysSince(lastAction);
  
  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(lead.id)}
          className={`group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-[0_4px_15px_rgb(0,0,0,0.005)] cursor-grab active:cursor-grabbing transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md ${
            snapshot.isDragging 
              ? 'shadow-xl ring-4 ring-blue-500/10 border-blue-500 scale-[1.02] z-50' 
              : ''
          }`}
        >
          <div className="flex items-start gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-100 dark:border-slate-700">
              {lead.profile_photo_url ? (
                <img src={lead.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase">
                  {lead.full_name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[13px] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                {lead.full_name}
              </h4>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-0.5">{lead.designation || 'Prospect'}</p>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
            {days !== null ? (
              <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                days <= 2 
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
                  : 'text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <Clock size={10} strokeWidth={2.5} />
                <span>{days === 0 ? 'Today' : `${days}d`}</span>
              </div>
            ) : <div />}
            
            {lead.reply_received ? (
              <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-100/50 dark:border-emerald-900/30">
                <MessageSquare size={9} fill="currentColor" />
                <span>Replied</span>
              </div>
            ) : <StepBadge step={lead.current_step} />}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// Always shown, whatever the sequence looks like — and the only columns a lead
// can be dragged into, because moving someone into the middle of a sequence
// would skip or repeat steps the engine has already run.
const TERMINAL_COLUMNS = [
  { id: 'replied', label: 'Replied', color: 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/20' },
  { id: 'shortlisted', label: 'Qualified', color: 'bg-green-50/50 text-green-600 border-green-100/50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/20' },
  { id: 'not_interested', label: 'Excluded', color: 'bg-rose-50/50 text-rose-600 border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/20' },
];

const STAGE_COLOR = 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800';

/**
 * @param {Array} steps  campaign sequence from GET /api/campaigns/:id — when
 *                       provided the board mirrors that campaign's own steps,
 *                       otherwise it falls back to the generic status columns.
 */
export default function KanbanBoard({ leads, onUpdate, onLeadClick, steps = null }) {
  const stageSteps = (steps || []).filter(s => s.is_stage && s.type !== 'end');
  const dynamic = stageSteps.length > 0;

  const columns = dynamic
    ? [
        ...stageSteps.map(s => ({ id: s.node_id, label: s.label, color: STAGE_COLOR, sequence: true })),
        { id: '__done', label: 'Completed', color: STAGE_COLOR, sequence: true },
        ...TERMINAL_COLUMNS,
      ]
    : COLUMNS;

  const grouped = {};
  for (const col of columns) grouped[col.id] = [];

  if (dynamic) {
    for (const lead of leads) {
      const step = lead.current_step;
      // Terminal states win — a replied lead belongs in Replied, not mid-sequence
      const terminal = TERMINAL_COLUMNS.find(c => c.id === lead.status);
      if (terminal) { grouped[terminal.id].push(lead); continue; }
      if (!step || step.state === 'no_flow') { grouped[columns[0].id].push(lead); continue; }
      if (step.state === 'done') { grouped.__done.push(lead); continue; }
      // A lead inside a delay belongs to the step it is waiting for
      const target = step.state === 'waiting_delay' ? step.next_stage_id : step.stage_id;
      if (target && grouped[target]) grouped[target].push(lead);
      else grouped[columns[0].id].push(lead);
    }
  } else {
    for (const col of columns) grouped[col.id] = leads.filter((l) => l.status === col.id);
  }

  async function onDragEnd(result) {
    if (!result.destination) return;
    const leadId = parseInt(result.draggableId);
    const newStatus = result.destination.droppableId;
    if (result.source.droppableId === newStatus) return;
    // Sequence columns are engine-owned; only the manual outcomes are droppable
    if (!TERMINAL_COLUMNS.some(c => c.id === newStatus)) return;

    try {
      await axios.put(`/api/leads/${leadId}/status`, { status: newStatus });
      onUpdate?.();
    } catch (e) {
      console.error('Failed to update lead status:', e);
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {columns.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-64 flex flex-col">
            
            {/* Column Label Header */}
            <div className={`rounded-2xl px-3.5 py-3 mb-4 flex items-center justify-between border transition-all ${col.color}`}>
              <span className="text-[10px] font-black uppercase tracking-widest">{col.label}</span>
              <span className="text-[9px] font-black bg-white/60 dark:bg-black/30 rounded-md px-2 py-0.5 border border-white/40 dark:border-transparent">
                {grouped[col.id].length}
              </span>
            </div>
            
            <Droppable droppableId={col.id} isDropDisabled={!!col.sequence}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 space-y-3 rounded-[24px] p-2.5 transition-all duration-200 border-2 border-dashed ${
                    snapshot.isDraggingOver 
                      ? 'bg-blue-50/30 border-blue-200 dark:bg-blue-950/10 dark:border-blue-900/40 shadow-inner' 
                      : 'border-transparent'
                  }`}
                >
                  {grouped[col.id].length === 0 && !snapshot.isDraggingOver ? (
                    <div className="flex flex-col items-center justify-center py-14 opacity-25">
                      <User size={20} className="text-slate-400 dark:text-slate-500 mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Empty Column</p>
                    </div>
                  ) : null}
                  
                  {grouped[col.id].map((lead, index) => (
                    <LeadCard key={lead.id} lead={lead} index={index} onClick={onLeadClick} />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
