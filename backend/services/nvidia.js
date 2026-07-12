const axios = require('axios');
const { getDb, getSetting } = require('../config/database');
const { nvidiaBreaker } = require('./circuitBreaker');
const { createLogger } = require('./logger');

const log = createLogger('Nvidia');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getSystemPrompt(userId) {
  if (!userId) {
    return "You are a professional outreach assistant. Generate concise, warm, personalized LinkedIn messages. Never sound robotic or copy-paste generic. Always use the prospect's actual name and relevant professional details. Keep tone professional yet friendly. Return only the message text — no explanations, no quotes around the message.";
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT business_type, business_context, ai_persona FROM users WHERE id = ?').get(userId);

    if (user && user.ai_persona && user.ai_persona.trim()) {
      return user.ai_persona.trim();
    }

    if (user && user.business_context && user.business_context.trim()) {
      return `You are a professional outreach assistant. Your role is to help craft personalized LinkedIn messages for B2B lead generation. The business context: ${user.business_context.trim()}. Generate concise, warm, personalized messages. Never sound robotic. Always use the prospect's actual name and relevant professional details. Keep tone professional yet friendly. Return only the message text — no explanations, no quotes around the message.`;
    }
  } catch (e) {
    log.error({ err: e.message }, 'Failed to load custom system prompt');
  }

  return "You are a professional outreach assistant. Generate concise, warm, personalized LinkedIn messages. Never sound robotic or copy-paste generic. Always use the prospect's actual name and relevant professional details. Keep tone professional yet friendly. Return only the message text — no explanations, no quotes around the message.";
}

async function callNvidia(userPrompt, maxTokens = 500, userId = null) {
  const apiKey = getSetting('NVIDIA_API_KEY');
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not set');

  const systemPrompt = getSystemPrompt(userId);

  // R5: Circuit breaker wraps the retry loop
  return await nvidiaBreaker.call(async () => {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await axios.post(
          'https://integrate.api.nvidia.com/v1/chat/completions',
          {
            model: 'meta/llama-3.1-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: maxTokens,
            temperature: 0.7,
            top_p: 1,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );
        return res.data.choices?.[0]?.message?.content?.trim() || '';
      } catch (err) {
        lastError = err;
        if (attempt < 3) await sleep(2000);
      }
    }
    throw new Error(`Nvidia API failed after 3 attempts: ${lastError?.response?.data?.message || lastError.message}`);
  });
}

async function generateConnectionNote(lead, userId = null) {
  let context = '';
  if (lead.profile_json) {
    try {
      const profile = JSON.parse(lead.profile_json);
      const skills = (profile.skills || []).slice(0, 5).join(', ');
      const experience = (profile.experience || []).slice(0, 2).map(e => `${e.title} at ${e.company_name}`).join(', ');
      context = `Extra Context from their full profile: Skills: ${skills}. Recent Experience: ${experience}. `;
    } catch (e) {}
  }
  const prompt = `${context}Write a LinkedIn connection request note for ${lead.full_name} who works as ${lead.designation || 'a professional'} at ${lead.company || 'their company'}. Use the prospect's name and relevant professional details to write a highly personalized, warm note under 280 characters. No emojis. Only return the note text, no extra commentary or quotes.`;
  try {
    const text = await callNvidia(prompt, 150, userId);
    return { success: true, data: text.slice(0, 280) };
  } catch (err) {
    return { success: false, data: '', error: err.message };
  }
}

async function generateJDMessage(lead, jdSummary, userId = null) {
  const prompt = `Write a LinkedIn message to ${lead.full_name} (${lead.designation || 'professional'} at ${lead.company || 'their company'}) who just accepted my connection request. Share this pitch/offer details with them: ${jdSummary}. Structure: 1) Brief warm opening acknowledging connection, 2) Pitch description naturally, 3) Why they could be a fit, 4) Clear call to action to reply or schedule a call. Max 400 words. Conversational tone, not a sales copy-paste.`;
  try {
    const text = await callNvidia(prompt, 600, userId);
    return { success: true, data: text };
  } catch (err) {
    return { success: false, data: '', error: err.message };
  }
}

async function generateFollowUp(lead, followUpNumber, userId = null) {
  const daysAgo = followUpNumber === 1 ? '3' : '6';
  const prompt = `Write follow-up ${followUpNumber} to ${lead.full_name} about the pitch shared ${daysAgo} days ago with no reply. Keep it brief (under 120 words), friendly, not pushy or desperate. Acknowledge they might be busy. End with a simple open-ended question.`;
  try {
    const text = await callNvidia(prompt, 200, userId);
    return { success: true, data: text };
  } catch (err) {
    return { success: false, data: '', error: err.message };
  }
}

async function generateAIReply(lead, conversationHistory, lastMessage, userId = null) {
  let historyText = '';
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    historyText = conversationHistory.map(m => {
      const sender = (m.is_from_me || m.from_me) ? 'Me' : lead.full_name;
      return `${sender}: ${m.text || m.content}`;
    }).join('\n');
  }

  const prompt = `Based on the conversation history with ${lead.full_name}:\n${historyText}\n\nThey recently replied: '${lastMessage}'. Generate 3 short, context-aware reply options (under 80 words each). Ensure the suggestions fit the context and don't repeat what was already said. Return ONLY valid JSON array: [{"type":"ask_details","text":"..."},{"type":"schedule_call","text":"..."},{"type":"share_details","text":"..."}]`;
  try {
    const text = await callNvidia(prompt, 400, userId);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');
    const suggestions = JSON.parse(jsonMatch[0]);
    return { success: true, data: suggestions };
  } catch (err) {
    return {
      success: false,
      data: [
        { type: 'ask_details', text: `Hi ${lead.full_name.split(' ')[0]}, great to hear from you! Could you share some more details so we can move things forward?` },
        { type: 'schedule_call', text: `Hi ${lead.full_name.split(' ')[0]}, would you be free for a quick 15-minute call this week to explore mutual synergy?` },
        { type: 'share_details', text: `Hi ${lead.full_name.split(' ')[0]}, happy to share more details. What specific aspects would you like to know more about?` },
      ],
      error: err.message,
    };
  }
}

async function categorizeMessage(messageText, userId = null) {
  const prompt = `Analyze this message from a prospect replying to an outreach message: "${messageText}".
Categorize their response intent into exactly one of these three categories:
- positive (e.g., interested, asking for details, wanting to call, sharing info)
- negative (e.g., not interested, happy where they are, stop messaging, not relevant)
- neutral (e.g., maybe later, just connecting, out of office)
Return ONLY the category word in lowercase (positive, negative, or neutral). No other text.`;
  try {
    let text = await callNvidia(prompt, 50, userId);
    text = text.toLowerCase().trim();
    if (['positive', 'negative', 'neutral'].includes(text)) return text;
    return 'neutral'; // fallback
  } catch (err) {
    return 'neutral';
  }
}

async function generateIcebreaker(lead, userId = null) {
  let context = '';
  if (lead.profile_json) {
    try {
      const profile = JSON.parse(lead.profile_json);
      const skills = (profile.skills || []).slice(0, 5).join(', ');
      const experience = (profile.experience || []).slice(0, 2).map(e => `${e.title} at ${e.company_name}`).join(', ');
      context = `Extra Context from their full profile: Skills: ${skills}. Recent Experience: ${experience}. `;
    } catch (e) {}
  }

  const prompt = `${context}Write a highly personalized, single-sentence "ice-breaker" opening for a LinkedIn message to ${lead.full_name}, who is a ${lead.designation || 'professional'} at ${lead.company || 'their company'} in ${lead.location || 'their area'}. 
Goal: Make them feel noticed as an individual before pitching your offer.
Examples of good ice-breakers: 
- "Saw your recent move to [Company], impressive trajectory!"
- "Noticed you've been leading engineering at [Company] for 3 years now."
- "Your background in [Industry/Tech] from [Location] caught my eye."
Return ONLY the single sentence ice-breaker. No greeting like "Hi", no quotes, no extra text.`;
  try {
    const text = await callNvidia(prompt, 100, userId);
    return { success: true, data: text };
  } catch (err) {
    return { success: false, data: '', error: err.message };
  }
}

async function calculateFitScore(lead, jdSummary, userId = null) {
  if (!lead.profile_json || !jdSummary) return 0;
  
  const prompt = `Compare this LinkedIn Profile to the Offer/Pitch below. 
Profile Bio/Headline: ${lead.headline}
Full Profile Data: ${lead.profile_json}

Offer Details: ${jdSummary}

Evaluate the fit based on: 1) Relevant Experience, 2) Skills match, 3) Location/Seniority.
Return ONLY a numeric score between 0 and 100. No text, no explanation.`;

  try {
    const text = await callNvidia(prompt, 50, userId);
    const score = parseInt(text.replace(/[^0-9]/g, ''));
    return isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
  } catch (err) {
    return 0;
  }
}

async function generateAutoDraft(lead, lastMessage, jdTemplate, userId = null) {
  const prompt = `You are a professional outreach assistant. A prospect named ${lead.full_name} (${lead.designation || 'professional'} at ${lead.company || 'their company'}) sent this reply:
"${lastMessage}"

Based on this, draft a response.
Guidelines:
1. If the prospect is asking for more details/info about your offer (e.g. "Tell me more", "Interested to know details", "What is it?", "Share details"):
   Generate a reply sharing the offer details. Here is our default pitch/offer description:
   """
   ${jdTemplate || 'an exciting new offering matching their background'}
   """
   Adapt the template to be a natural, conversational response that directly answers their reply. Keep it friendly.

2. If the prospect is not interested (e.g. "Not interested", "No thanks", "Not relevant"):
   Generate a brief, very polite closing response thanking them for their time (e.g., "Thanks for letting me know! Wish you all the best.").

3. Otherwise (asking for call, wanting details, etc.):
   Draft a suitable short professional response.

Keep the response brief (max 100 words), direct, and personalized. Return ONLY the reply message text — no placeholders, no comments, no explanations, no quotes around the reply.`;

  try {
    const text = await callNvidia(prompt, 300, userId);
    return { success: true, data: text };
  } catch (err) {
    const msg = lastMessage.toLowerCase();
    let reply = `Hi ${lead.full_name.split(' ')[0]}, thank you for your response! Let me know if you would be open to a quick call to explore mutual synergy.`;
    if (msg.includes('details') || msg.includes('more info') || msg.includes('tell me') || msg.includes('what is it') || msg.includes('jd') || msg.includes('job description')) {
      reply = `Hi ${lead.full_name.split(' ')[0]}, here are the details of our offering:\n\n${jdTemplate || 'It is an exciting offering matching your background. Would love to share details if we can set up a quick chat.'}`;
    } else if (msg.includes('not interested') || msg.includes('no thanks') || msg.includes('stop') || msg.includes('unsubscribe') || msg.includes('not relevant')) {
      reply = `Thank you for letting me know, ${lead.full_name.split(' ')[0]}! Wish you all the best.`;
    }
    return { success: true, data: reply };
  }
}

async function getAutoTags(lead, lastMessage, userId = null) {
  const prompt = `Analyze this prospect response to an outreach message: "${lastMessage}"
Prospect details: Designation: ${lead.designation || 'professional'}, Fit Score: ${lead.fit_score || 0}.

Select all relevant tags from this list that apply:
- "Interested" (if they show interest or want to talk)
- "Not Interested" (if they are not interested, ask to stop, or not relevant)
- "High Fit" (only if their fit score is 75 or higher)
- "Call Requested" (if they ask for a call, calendar, phone, or interview)
- "Document Shared" (if they mention sharing or sending documents/details)
- "Info Requested" (if they ask for details, questions, or company info)

Return a valid JSON array of strings containing the matched tags (e.g., ["Interested", "High Fit"]). Return ONLY the JSON array.`;
  try {
    const text = await callNvidia(prompt, 100, userId);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');
    const tags = JSON.parse(jsonMatch[0]);
    if (Array.isArray(tags)) {
      // Always ensure "High Fit" is added if fit_score >= 75 and they show interest
      if (lead.fit_score >= 75 && !tags.includes('High Fit') && tags.includes('Interested')) {
        tags.push('High Fit');
      }
      return tags;
    }
    return [];
  } catch (err) {
    const tags = [];
    const msg = lastMessage.toLowerCase();
    if (msg.includes('call') || msg.includes('schedule') || msg.includes('meet') || msg.includes('calendar') || msg.includes('discuss')) {
      tags.push('Call Requested');
    }
    if (msg.includes('cv') || msg.includes('resume') || msg.includes('document') || msg.includes('file') || msg.includes('attachment')) {
      tags.push('Document Shared');
    }
    if (msg.includes('details') || msg.includes('info') || msg.includes('questions') || msg.includes('jd') || msg.includes('job description')) {
      tags.push('Info Requested');
    }
    return tags;
  }
}

module.exports = {
  generateConnectionNote,
  generateJDMessage,
  generateFollowUp,
  generateAIReply,
  categorizeMessage,
  generateIcebreaker,
  calculateFitScore,
  generateAutoDraft,
  getAutoTags,
};
