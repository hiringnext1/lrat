const { getSetting } = require('../config/database');

const DEFAULT_WEIGHTS = {
  seniority: {
    executive: 40,
    manager: 30,
    senior: 20,
    junior: 10
  },
  companySize: {
    large: 30,
    medium: 20,
    small: 10
  },
  responsiveness: {
    replied: 30
  }
};

function getScoringWeights() {
  try {
    const raw = getSetting('LEAD_SCORING_WEIGHTS');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Scoring] Failed to parse custom weights, using defaults:', e.message);
  }
  return DEFAULT_WEIGHTS;
}

function calculateScore(lead, weights = null) {
  const activeWeights = weights || getScoringWeights();
  let score = 0;

  // 1. Evaluate Seniority (Max Seniority Weight)
  const title = (lead.designation || lead.headline || '').toLowerCase();
  let seniorityPoints = activeWeights.seniority.junior; // default fallback

  if (/\b(ceo|founder|director|vp|head|chief|president|partner|owner|exec|c level|co-founder|co-ceo)\b/.test(title)) {
    seniorityPoints = activeWeights.seniority.executive;
  } else if (/\b(manager|lead|leader|supervisor|architect|mgr)\b/.test(title)) {
    seniorityPoints = activeWeights.seniority.manager;
  } else if (/\b(senior|sr|expert|consultant|specialist|lead developer)\b/.test(title)) {
    seniorityPoints = activeWeights.seniority.senior;
  } else if (/\b(junior|jr|associate|assistant|intern|trainee|apprentice)\b/.test(title)) {
    seniorityPoints = activeWeights.seniority.junior;
  } else {
    // If undefined or general, give senior or middle ground
    seniorityPoints = activeWeights.seniority.senior;
  }
  score += seniorityPoints;

  // 2. Evaluate Company Size (Max Company Size Weight)
  let companySizePoints = activeWeights.companySize.small;
  let companyName = (lead.company || '').toLowerCase().trim();

  const largeCompanyKeywords = [
    'google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix', 'uber', 'salesforce', 'adobe', 
    'tcs', 'infosys', 'wipro', 'cognizant', 'accenture', 'capgemini', 'ibm', 'oracle', 'sap',
    'deloitte', 'ey', 'kpmg', 'pwc', 'walmart', 'samsung', 'intel', 'cisco'
  ];

  let hasLargeKeyword = largeCompanyKeywords.some(keyword => companyName.includes(keyword));
  
  // Also check profile_json details if parsed
  let parsedSize = null;
  if (lead.profile_json) {
    try {
      const profile = JSON.parse(lead.profile_json);
      if (profile.company_size) {
        parsedSize = parseInt(profile.company_size, 10);
      }
    } catch (_) {}
  }

  if (hasLargeKeyword || (parsedSize && parsedSize >= 1000)) {
    companySizePoints = activeWeights.companySize.large;
  } else if (parsedSize && parsedSize >= 100 && parsedSize < 1000) {
    companySizePoints = activeWeights.companySize.medium;
  } else if (parsedSize && parsedSize > 0 && parsedSize < 100) {
    companySizePoints = activeWeights.companySize.small;
  } else {
    // Default fallback if unknown size
    companySizePoints = activeWeights.companySize.medium;
  }
  score += companySizePoints;

  // 3. Evaluate Responsiveness
  if (lead.reply_received === 1) {
    score += activeWeights.responsiveness.replied;
  }

  // Bound score strictly between 0 and 100
  return Math.min(100, Math.max(0, score));
}

module.exports = {
  getScoringWeights,
  calculateScore,
  DEFAULT_WEIGHTS
};
