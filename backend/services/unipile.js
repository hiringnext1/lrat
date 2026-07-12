const axios = require('axios');
const { getSetting } = require('../config/database');
const { unipileBreaker } = require('./circuitBreaker');
const { createLogger } = require('./logger');

const log = createLogger('Unipile');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getClient() {
  const apiKey = getSetting('UNIPILE_API_KEY');
  const dsn = getSetting('UNIPILE_DSN');

  return axios.create({
    baseURL: dsn,
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

async function getAccounts() {
  try {
    const client = getClient();
    const res = await client.get('/api/v1/accounts');
    const items = res.data?.items || res.data?.accounts || res.data || [];
    const linkedin = Array.isArray(items)
      ? items.filter((a) => a.type === 'LINKEDIN' || a.provider === 'LINKEDIN')
      : [];
    return { success: true, data: linkedin };
  } catch (err) {
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

async function getProfilesFromSearchURL(searchUrl, accountId, cursor = null) {
  try {
    const client = getClient();
    await sleep(1000);
    
    const requestData = cursor ? { cursor } : { url: searchUrl };
    
    console.log(`[Unipile] Fetching leads batch... URL: ${searchUrl}, Cursor: ${cursor ? 'YES' : 'NO'}`);

    const res = await client.post('/api/v1/linkedin/search', 
      requestData,
      { params: { account_id: accountId, limit: 20 } }
    );
    
    const items = res.data?.items || [];
    const nextCursor = res.data?.cursor || res.data?.paging?.cursor || null;
    
    return { 
      success: true, 
      data: Array.isArray(items) ? items : [], 
      cursor: nextCursor 
    };
  } catch (err) {
    const errorDetail = err?.response?.data || err.message;
    console.error('[Unipile] LinkedIn Search Batch Failed:', JSON.stringify(errorDetail, null, 2));
    return { success: false, data: [], error: errorDetail };
  }
}

async function sendConnectionRequest(accountId, linkedinMemberId, note) {
  try {
    return await unipileBreaker.call(async () => {
      const client = getClient();
      await sleep(1000);
      // Unipile V1: POST /api/v1/users/invite
      const res = await client.post('/api/v1/users/invite', {
        account_id: accountId,
        provider_id: linkedinMemberId,
        message: note || '',
      });
      return { success: true, data: res.data };
    });
  } catch (err) {
    if (err.circuitOpen) {
      log.warn({ fn: 'sendConnectionRequest' }, err.message);
      return { success: false, data: null, error: 'Service temporarily unavailable (circuit open)', isRateLimit: false };
    }
    const status = err?.response?.status;
    const data = err?.response?.data;
    const errStr = JSON.stringify(data || '').toLowerCase();
    
    // 422 is used for many things. Only treat as rate limit if it mentions "rate", "limit", or "resend_yet"
    // and EXCLUDE "already_invited" or "already_sent"
    const isRateLimit = (status === 429 || status === 422) && 
                       (errStr.includes('rate') || errStr.includes('limit') || errStr.includes('resend_yet')) &&
                       !errStr.includes('already_invited') && 
                       !errStr.includes('already_sent');
                       
    return { success: false, data: null, error: data || err.message, isRateLimit };
  }
}

async function getNewAcceptances(accountId, since) {
  try {
    const client = getClient();
    await sleep(1000);
    // V1 correct endpoint for LinkedIn connections
    const params = { account_id: accountId };
    if (since) params.since = since;
    const res = await client.get('/api/v1/users/relations', { params });
    const relations = res.data?.items || res.data?.relations || res.data || [];
    return { success: true, data: relations };
  } catch (err) {
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

async function sendMessage(accountId, linkedinMemberId, messageText) {
  try {
    return await unipileBreaker.call(async () => {
      const client = getClient();
      await sleep(1000);
      const res = await client.post('/api/v1/chats', {
        account_id: accountId,
        attendees_ids: [linkedinMemberId],
        text: messageText,
      });
      return { success: true, data: res.data };
    });
  } catch (err) {
    if (err.circuitOpen) {
      log.warn({ fn: 'sendMessage' }, err.message);
      return { success: false, data: null, error: 'Service temporarily unavailable (circuit open)' };
    }
    return { success: false, data: null, error: err?.response?.data || err.message };
  }
}

async function getConversations(accountId) {
  try {
    const client = getClient();
    await sleep(1000);
    const res = await client.get('/api/v1/chats', {
      params: { account_id: accountId },
    });
    const chats = res.data?.items || res.data?.chats || res.data || [];
    return { success: true, data: chats };
  } catch (err) {
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

async function getMessages(chatId) {
  try {
    const client = getClient();
    await sleep(1000);
    const res = await client.get(`/api/v1/chats/${chatId}/messages`);
    const messages = res.data?.items || res.data?.messages || res.data || [];
    return { success: true, data: messages };
  } catch (err) {
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

async function sendReply(chatId, messageText) {
  try {
    return await unipileBreaker.call(async () => {
      const client = getClient();
      await sleep(1000);
      const res = await client.post(`/api/v1/chats/${chatId}/messages`, {
        text: messageText,
      });
      return { success: true, data: res.data };
    });
  } catch (err) {
    if (err.circuitOpen) {
      log.warn({ fn: 'sendReply' }, err.message);
      return { success: false, data: null, error: 'Service temporarily unavailable (circuit open)' };
    }
    return { success: false, data: null, error: err?.response?.data || err.message };
  }
}

async function viewProfile(accountId, linkedinMemberId) {
  try {
    const client = getClient();
    await sleep(1000);
    const res = await client.get(`/api/v1/users/${linkedinMemberId}`, {
      params: { account_id: accountId },
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
  }
}

async function getRecentPosts(accountId, linkedinMemberId) {
  try {
    const client = getClient();
    await sleep(1000);
    const res = await client.get('/api/v1/linkedin/posts', {
      params: { account_id: accountId, author_identifier: linkedinMemberId, limit: 5 },
    });
    const posts = res.data?.items || res.data?.posts || res.data || [];
    return { success: true, data: Array.isArray(posts) ? posts : [] };
  } catch (err) {
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

async function likePost(accountId, postId) {
  try {
    const client = getClient();
    await sleep(1000);
    const res = await client.post(`/api/v1/linkedin/posts/${postId}/like`, {
      account_id: accountId,
    });
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
  }
}

async function deleteAccount(accountId) {
  try {
    const client = getClient();
    await client.delete(`/api/v1/accounts/${accountId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
  }
}

async function getAttendee(attendeeId) {
  try {
    const client = getClient();
    const res = await client.get(`/api/v1/attendees/${attendeeId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, data: null, error: err?.response?.data || err.message };
  }
}

module.exports = {
  getAccounts,
  getProfilesFromSearchURL,
  sendConnectionRequest,
  getNewAcceptances,
  sendMessage,
  getConversations,
  getMessages,
  sendReply,
  viewProfile,
  getRecentPosts,
  likePost,
  getAttendee,
  deleteAccount,
};
