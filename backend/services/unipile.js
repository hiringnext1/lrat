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

function isLinkedInAccount(a) {
  if (!a || typeof a !== 'object') return false;
  const isMatch = (str) => typeof str === 'string' && str.toUpperCase().includes('LINKEDIN');
  
  if (isMatch(a.type) || isMatch(a.provider) || isMatch(a.account_type) || isMatch(a.service) || isMatch(a.provider_name)) {
    return true;
  }
  if (Array.isArray(a.sources)) {
    if (a.sources.some(s => isMatch(s?.type) || isMatch(s?.provider) || isMatch(s?.service))) {
      return true;
    }
  }
  // Fallback: If item has an id/account_id and is not explicitly mail/whatsapp/etc.
  if ((a.id || a.account_id) && !a.type && !a.provider) {
    return true;
  }
  return false;
}

async function getAccounts() {
  try {
    const client = getClient();
    const res = await client.get('/api/v1/accounts');
    unipileBreaker.reset();

    const isDebug = process.env.DEBUG_UNIPILE !== 'false';
    if (isDebug) {
      console.log('[Unipile Debug - Raw Accounts]', JSON.stringify(res.data, null, 2));
    }

    const items = res.data?.items || res.data?.accounts || (Array.isArray(res.data) ? res.data : []);
    const linkedin = Array.isArray(items)
      ? items.filter(isLinkedInAccount)
      : [];

    if (isDebug) {
      console.log(`[Unipile Debug - Filtered Accounts] Found ${linkedin.length} matching LinkedIn account(s) out of ${items.length} total items.`);
    }

    return { success: true, data: linkedin };
  } catch (err) {
    console.error('[Unipile Error - getAccounts]', err?.response?.data || err.message);
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

async function getProfilesFromSearchURL(searchUrl, accountId, cursor = null) {
  try {
    const client = getClient();
    // 🕐 Human-like read delay: simulate time a human takes to look at search results (3-7s)
    const readDelaySecs = Math.floor(Math.random() * (7 - 3 + 1)) + 3;
    await sleep(readDelaySecs * 1000);
    
    const requestData = cursor ? { cursor } : { url: searchUrl };
    
    // Detect URL type for logging
    let urlType = 'unknown';
    if (searchUrl) {
      if (searchUrl.includes('linkedin.com/sales/')) urlType = 'Sales Navigator';
      else if (searchUrl.includes('linkedin.com/recruiter/')) urlType = 'LinkedIn Recruiter';
      else if (searchUrl.includes('linkedin.com/search/results/')) urlType = 'Regular LinkedIn';
    }
    
    console.log(`[Unipile] Fetching leads batch... Type: ${urlType}, Cursor: ${cursor ? 'YES' : 'NO'}`);

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
    const resObj = await unipileBreaker.call(async () => {
      const client = getClient();
      await sleep(1000);
      try {
        // Unipile V1: POST /api/v1/users/invite
        const res = await client.post('/api/v1/users/invite', {
          account_id: accountId,
          provider_id: linkedinMemberId,
          message: note || '',
        });
        return { success: true, data: res.data };
      } catch (axiosErr) {
        const status = axiosErr?.response?.status;
        const data = axiosErr?.response?.data;
        const errStr = JSON.stringify(data || '').toLowerCase();

        const isAlreadyInvited = (status === 422 || status === 400) && (
          errStr.includes('already_invited') ||
          errStr.includes('already_sent')
        );

        const isCooldown = (status === 422 || status === 400 || status === 429) && (
          errStr.includes('cannot_resend_yet') ||
          errStr.includes('cannot resend yet') ||
          errStr.includes('cooldown')
        );

        if (isAlreadyInvited || isCooldown) {
          // Return non-throwing result inside breaker call so failure counter is NOT incremented
          return { 
            success: false, 
            benign: true, 
            isAlreadyInvited, 
            isCooldown, 
            data: null, 
            error: data || axiosErr.message 
          };
        }
        // Let genuine failures (5xx, timeouts, network, rate limits) throw to trigger breaker
        throw axiosErr;
      }
    });

    if (resObj.benign) {
      return { 
        success: false, 
        data: null, 
        error: resObj.error, 
        isAlreadyInvited: resObj.isAlreadyInvited, 
        isCooldown: resObj.isCooldown, 
        isRateLimit: !!resObj.isCooldown 
      };
    }

    return resObj;
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
    const resObj = await unipileBreaker.call(async () => {
      const client = getClient();
      await sleep(1000);
      try {
        const res = await client.post('/api/v1/chats', {
          account_id: accountId,
          attendees_ids: [linkedinMemberId],
          text: messageText,
        });
        return { success: true, data: res.data };
      } catch (axiosErr) {
        const status = axiosErr?.response?.status;
        const data = axiosErr?.response?.data;
        const errStr = JSON.stringify(data || '').toLowerCase();

        const isBenign = (status === 422 || status === 400) && (
          errStr.includes('already_exists') ||
          errStr.includes('chat_exists') ||
          errStr.includes('cannot_resend_yet') ||
          errStr.includes('cannot resend yet')
        );

        if (isBenign) {
          return { success: false, benign: true, data: null, error: data || axiosErr.message };
        }
        throw axiosErr;
      }
    });

    if (resObj.benign) {
      return { success: false, data: null, error: resObj.error };
    }

    return resObj;
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
    const resObj = await unipileBreaker.call(async () => {
      const client = getClient();
      await sleep(1000);
      try {
        const res = await client.post(`/api/v1/chats/${chatId}/messages`, {
          text: messageText,
        });
        return { success: true, data: res.data };
      } catch (axiosErr) {
        const status = axiosErr?.response?.status;
        const data = axiosErr?.response?.data;
        const errStr = JSON.stringify(data || '').toLowerCase();

        const isBenign = (status === 422 || status === 400) && (
          errStr.includes('duplicate') ||
          errStr.includes('cannot_resend_yet') ||
          errStr.includes('cannot resend yet')
        );

        if (isBenign) {
          return { success: false, benign: true, data: null, error: data || axiosErr.message };
        }
        throw axiosErr;
      }
    });

    if (resObj.benign) {
      return { success: false, data: null, error: resObj.error };
    }

    return resObj;
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

async function getChatAttendees(chatId) {
  try {
    const client = getClient();
    const res = await client.get(`/api/v1/chats/${chatId}/attendees`);
    const items = res.data?.items || res.data?.attendees || res.data || [];
    return { success: true, data: Array.isArray(items) ? items : [] };
  } catch (err) {
    return { success: false, data: [], error: err?.response?.data || err.message };
  }
}

function extractPublicIdentifier(linkedinUrl) {
  if (!linkedinUrl || typeof linkedinUrl !== 'string') return null;
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

async function resolveProfileFromUrl(accountId, linkedinUrl) {
  const publicIdentifier = extractPublicIdentifier(linkedinUrl);
  if (!publicIdentifier) {
    return { success: false, error: 'Could not extract a public identifier from linkedin_url' };
  }
  try {
    const client = getClient();
    await sleep(1000);
    const res = await client.get(`/api/v1/users/${publicIdentifier}`, {
      params: { account_id: accountId },
    });
    const data = res.data || {};
    const memberId = data.provider_id || data.id || data.member_id || null;
    if (!memberId) {
      return { success: false, error: 'Profile resolved but no provider_id/member_id returned' };
    }
    return { success: true, data, memberId };
  } catch (err) {
    return { success: false, error: err?.response?.data || err.message };
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
  getChatAttendees,
  deleteAccount,
  extractPublicIdentifier,
  resolveProfileFromUrl,
};
