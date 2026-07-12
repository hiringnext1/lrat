import { useEffect, useState } from 'react';
import axios from 'axios';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import LeadInfoPanel from '../components/LeadInfoPanel';
import socket from '../socket';

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [cannedMessages, setCannedMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recency');

  async function fetchConversations(sortVal = sortBy) {
    try {
      const res = await axios.get('/api/inbox/conversations', { params: { sort: sortVal } });
      setConversations(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchConversations(sortBy);
  }, [sortBy]);

  useEffect(() => {
    axios.get('/api/accounts').then((r) => setAccounts(r.data.data || []));
    axios.get('/api/campaigns').then((r) => setCampaigns(r.data.data || []));
    axios.get('/api/inbox/canned').then((r) => setCannedMessages(r.data.data || []));

    const onNewReply = () => fetchConversations(sortBy);
    socket.on('new_reply', onNewReply);
    return () => socket.off('new_reply', onNewReply);
  }, []);

  function onMarkedReplied() {
    fetchConversations();
    if (activeConv?.lead) {
      setActiveConv((prev) => ({ ...prev, lead: { ...prev.lead, reply_received: 1 } }));
    }
  }

  function onLeadUpdate() {
    fetchConversations();
    if (activeConv?.lead?.id) {
      axios.get('/api/leads', { params: { limit: 1 } }).then(() => {});
    }
  }

  async function selectConversation(conv) {
    setActiveConv(conv);
    if (conv?.lead && !conv.lead.is_read) {
      try {
        await axios.put(`/api/inbox/conversations/${conv.id}/read`, { lead_id: conv.lead.id });
        // Update local state to reflect read status
        setConversations(prev => prev.map(c => 
          c.id === conv.id ? { ...c, lead: { ...c.lead, is_read: 1 } } : c
        ));
        window.dispatchEvent(new Event('inbox_updated'));
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-2">Loading inbox…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-white dark:bg-slate-950">
      <ConversationList
        conversations={conversations}
        activeId={activeConv?.id}
        onSelect={selectConversation}
        accounts={accounts}
        campaigns={campaigns}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      <ChatWindow
        conversation={activeConv}
        onMarkedReplied={onMarkedReplied}
        cannedMessages={cannedMessages}
      />
      <LeadInfoPanel
        lead={activeConv?.lead}
        onUpdate={onLeadUpdate}
      />
    </div>
  );
}
