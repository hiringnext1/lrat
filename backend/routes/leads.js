const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const { Parser } = require('json2csv');
const fs = require('fs');
const { getDb } = require('../config/database');
const unipile = require('../services/unipile');
const { calculateScore, getScoringWeights } = require('../services/leadScoring');
const path = require('path');
const os = require('os');
const { requireActiveSubscription } = require('../middleware/planGuard');
const leadImporter = require('../services/leadImporter');
const flowProgress = require('../services/flowProgress');

// A LinkedIn people search returns roughly 1000 results, so importing beyond
// that just pages through nothing. Keep the UI and this value in sync.
const MAX_LEADS_PER_IMPORT = 1000;

const uploadDir = path.join(os.tmpdir(), 'lrat-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { campaign_id, status, search, is_enriched, ai_sentiment, page = 1, limit = 50 } = req.query;

    let sql = 'SELECT * FROM leads WHERE user_id = ?';
    let countSql = 'SELECT COUNT(*) as c FROM leads WHERE user_id = ?';
    const params = [req.userId];

    if (campaign_id) { 
      const part = ' AND campaign_id = ?';
      sql += part; countSql += part;
      params.push(campaign_id); 
    }
    if (status) { 
      const part = ' AND status = ?';
      sql += part; countSql += part;
      params.push(status); 
    }
    if (is_enriched !== undefined && is_enriched !== '') {
      const part = ' AND is_enriched = ?';
      sql += part; countSql += part;
      params.push(parseInt(is_enriched));
    }
    if (ai_sentiment) {
      const part = ' AND ai_sentiment = ?';
      sql += part; countSql += part;
      params.push(ai_sentiment);
    }
    if (search) {
      const cleanSearch = (search || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
        .trim()
        .replace(/\s+/g, '%'); // Replace all space types/sequences with wildcard '%'

      if (cleanSearch) {
        const part = ' AND (full_name LIKE ? OR company LIKE ? OR designation LIKE ?)';
        sql += part; countSql += part;
        const s = `%${cleanSearch}%`;
        params.push(s, s, s);
      }
    }

    const total = db.prepare(countSql).get(...params).c;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const limitVal = parseInt(limit);
    const offsetVal = (parseInt(page) - 1) * limitVal;
    
    const leads = db.prepare(sql).all(...params, limitVal, offsetVal);
    // Additive: where each lead sits in its campaign sequence (read-only)
    flowProgress.attachProgress(db, leads);
    res.json({ success: true, data: leads, total, page: parseInt(page), limit: limitVal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ⚡ Sync & Import Accepted LinkedIn Connections directly into CRM
router.post('/sync-connections', requireActiveSubscription, async (req, res) => {
  try {
    const db = getDb();
    const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ? AND status = 'active' AND is_active = 1").all(req.userId);
    
    if (!accounts.length) {
      return res.status(400).json({ success: false, error: 'No active LinkedIn accounts found' });
    }

    let syncedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const account of accounts) {
      const result = await unipile.getNewAcceptances(account.unipile_account_id);
      if (!result.success || !result.data) continue;

      const items = Array.isArray(result.data) ? result.data : (result.data.items || result.data.relations || []);
      
      for (const item of items) {
        const memberId = item.member_id || item.provider_id || item.id || '';
        const publicId = item.public_identifier || '';
        const url = item.public_profile_url || item.url || '';
        const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.name || 'LinkedIn User';

        let lead = null;
        if (memberId || publicId) {
          lead = db.prepare(`
            SELECT * FROM leads 
            WHERE user_id = ?
            AND (
              (linkedin_member_id IS NOT NULL AND linkedin_member_id != '' AND (linkedin_member_id = ? OR linkedin_member_id = ?))
              OR (? != '' AND linkedin_url IS NOT NULL AND linkedin_url LIKE ?)
            )
            ORDER BY id DESC LIMIT 1
          `).get(req.userId, memberId, publicId, publicId, `%${publicId}%`);
        }

        if (!lead && fullName) {
          lead = db.prepare(`
            SELECT * FROM leads 
            WHERE user_id = ? AND LOWER(full_name) = LOWER(?)
            ORDER BY id DESC LIMIT 1
          `).get(req.userId, fullName);
        }

        if (lead) {
          // 🛡️ CRITICAL GUARD: Only sync acceptances for leads where we actually sent a connection.
          // This prevents leads from being auto-marked as 'connected' just because the recruiter
          // already knows this person on LinkedIn (existing connections in their network).
          if (lead.status !== 'connected' && (lead.connection_sent_at || lead.account_id_used)) {
            db.prepare("UPDATE leads SET status = 'connected', accepted_at = ?, updated_at = ? WHERE id = ?").run(now, now, lead.id);
            if (lead.campaign_id) {
              const actualAccepted = db.prepare("SELECT COUNT(*) as c FROM leads WHERE campaign_id = ? AND user_id = ? AND status IN ('connected', 'jd_sent', 'follow_up_sent')").get(lead.campaign_id, req.userId).c;
              db.prepare('UPDATE campaigns SET accepted = ?, updated_at = ? WHERE id = ?').run(actualAccepted, now, lead.campaign_id);
            }
            updatedCount++;
          }
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.userId}`).emit('leads_updated', { message: 'Connections synced successfully' });
    }

    res.json({
      success: true,
      message: `Synced ${syncedCount} new accepted connection(s) and updated ${updatedCount} existing lead(s) as Connected!`,
      synced_new: syncedCount,
      updated_existing: updatedCount
    });
  } catch (err) {
    console.error('[Sync Connections Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import/url', requireActiveSubscription, async (req, res) => {
  try {
    const db = getDb();
    const { search_url, account_id, campaign_id, max_leads } = req.body;
    const io = req.app.get('io');
    // Respect the user's requested max_leads. The cap used to be 500 while the
    // UI accepted any number, so asking for 1000 silently imported half.
    const targetCount = Math.min(Math.max(parseInt(max_leads) || 100, 1), MAX_LEADS_PER_IMPORT);

    if (!search_url || !account_id || !campaign_id) {
      return res.status(400).json({ success: false, error: 'search_url, account_id, and campaign_id are required' });
    }

    // Validate it's actually a LinkedIn URL
    if (!search_url.includes('linkedin.com')) {
      return res.status(400).json({ success: false, error: 'Invalid URL — must be a LinkedIn search URL (Regular LinkedIn or Sales Navigator)' });
    }

    // Detect URL type for logging
    let urlType = 'Regular LinkedIn';
    if (search_url.includes('linkedin.com/sales/')) urlType = 'Sales Navigator';
    else if (search_url.includes('linkedin.com/recruiter/')) urlType = 'LinkedIn Recruiter';
    console.log(`[Import] Starting ${urlType} import for campaign ${campaign_id}`);

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(account_id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(campaign_id, req.userId);
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const currentUserId = req.userId;

    // Create a database entry in sourcing_jobs. account_id + target_count are
    // stored so the job can be resumed after a restart (see services/leadImporter).
    const insertJob = db.prepare(
      'INSERT INTO sourcing_jobs (user_id, campaign_id, search_url, total_imported, status, account_id, target_count) VALUES (?, ?, ?, 0, ?, ?, ?)'
    ).run(currentUserId, campaign_id, search_url, 'processing', account.id, targetCount);
    const jobId = insertJob.lastInsertRowid;

    // Immediate response to UI, now including jobId
    res.json({ 
      success: true, 
      message: `Lead import started for up to ${targetCount} leads. Profiles arrive in batches of 20; already-imported people are skipped.`,
      campaign_id,
      job_id: jobId,
      target: targetCount
    });

    // Runs in the background; the cursor is persisted after every batch so a
    // deploy or crash can resume it instead of losing the import.
    leadImporter.runImportJob({
      jobId,
      searchUrl: search_url,
      unipileAccountId: account.unipile_account_id,
      campaignId: campaign_id,
      userId: currentUserId,
      targetCount,
      startCursor: null,
      alreadyImported: 0,
      io,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET active and recent import jobs
router.get('/import/jobs', async (req, res) => {
  try {
    const db = getDb();
    // Fetch latest 10 jobs
    const jobs = db.prepare(`
      SELECT j.*, c.name as campaign_name 
      FROM sourcing_jobs j 
      JOIN campaigns c ON j.campaign_id = c.id 
      WHERE j.user_id = ? 
      ORDER BY j.created_at DESC 
      LIMIT 10
    `).all(req.userId);
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function for flexible CSV column matching (BOM safe, case insensitive, fallback headers)
function getCsvRowValue(row, targetKey, fallbackKeys = []) {
  if (!row || typeof row !== 'object') return '';
  if (targetKey && row[targetKey] !== undefined && String(row[targetKey]).trim() !== '') {
    return String(row[targetKey]).trim();
  }
  const keys = Object.keys(row);
  const searchKeys = [targetKey, ...fallbackKeys].filter(Boolean).map(k => k.toLowerCase());
  for (const k of keys) {
    const cleanKey = k.replace(/^\uFEFF/, '').trim().toLowerCase();
    if (searchKeys.some(sk => cleanKey === sk || cleanKey.includes(sk))) {
      const val = row[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return '';
}

router.post('/import/csv', upload.single('file'), requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { campaign_id, mapping } = req.body;
    const colMap = mapping ? JSON.parse(mapping) : {};

    if (!req.file || !campaign_id) {
      return res.status(400).json({ success: false, error: 'CSV file and campaign_id are required' });
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(campaign_id, req.userId);
    if (!campaign) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const currentUserId = req.userId;
    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on('data', (row) => results.push(row))
      .on('end', () => {
        const now = new Date().toISOString();
        const weights = getScoringWeights();
        const transaction = db.transaction((rows) => {
          let imported = 0;
          let duplicates = 0;

          const insertLead = db.prepare(
            `INSERT OR IGNORE INTO leads
              (full_name, headline, company, designation, location, linkedin_url, linkedin_member_id, campaign_id, user_id, fit_score, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          );

          const checkDuplicateUrl = db.prepare('SELECT id FROM leads WHERE linkedin_url = ? AND (user_id = ? OR user_id IS NULL)');

          for (const row of rows) {
            const linkedinUrl = getCsvRowValue(row, colMap.linkedin_url, ['linkedin_url', 'linkedin url', 'url', 'profile url', 'linkedin', 'link', 'profile']);
            if (!linkedinUrl) continue;

            const existing = checkDuplicateUrl.get(linkedinUrl, currentUserId);
            if (existing) {
              duplicates++;
              continue;
            }

            const fullNameStr = getCsvRowValue(row, colMap.full_name, ['full_name', 'full name', 'name', 'first name', 'contact name']) || 'Unknown';
            const designationStr = getCsvRowValue(row, colMap.designation, ['designation', 'job title', 'title', 'position', 'role']);
            const headlineStr = getCsvRowValue(row, colMap.headline, ['headline', 'tagline', 'bio']);
            const companyStr = getCsvRowValue(row, colMap.company, ['company', 'company name', 'organization']);
            const locationStr = getCsvRowValue(row, colMap.location, ['location', 'city', 'country', 'region']);
            const memberIdStr = getCsvRowValue(row, colMap.member_id, ['member_id', 'member id', 'provider_id', 'provider id', 'id']);

            const score = calculateScore({
              designation: designationStr,
              headline: headlineStr,
              company: companyStr,
              reply_received: 0
            }, weights);

            const r = insertLead.run(
              fullNameStr,
              headlineStr,
              companyStr,
              designationStr,
              locationStr,
              linkedinUrl,
              memberIdStr,
              campaign_id,
              currentUserId,
              score,
              now,
              now
            );

            if (r.changes > 0) {
              imported++;
            } else {
              duplicates++;
            }
          }

          if (imported > 0) {
            db.prepare('UPDATE campaigns SET total_leads = total_leads + ? WHERE id = ?').run(imported, campaign_id);
          }

          return { imported, duplicates };
        });

        const { imported, duplicates } = transaction(results);

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.log(`[CSV Import] Processed ${results.length} row(s) for Campaign ${campaign_id}: ${imported} imported, ${duplicates} duplicates/skipped.`);
        res.json({ success: true, imported, duplicates, total: results.length });
      })
      .on('error', (err) => {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: err.message });
      });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import/preview', requireActiveSubscription, async (req, res) => {
  try {
    const { search_url, account_id } = req.body;
    
    if (!search_url || !account_id) {
      return res.status(400).json({ success: false, error: 'search_url and account_id required' });
    }
    const db = getDb();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(account_id, req.userId);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const result = await unipile.getProfilesFromSearchURL(search_url, account.unipile_account_id);
    if (!result.success) {
      console.error('[Leads Preview] Unipile Error:', result.error);
      return res.status(502).json({ success: false, error: 'Failed to fetch from LinkedIn', details: result.error });
    }

    const profiles = result.data || [];
    const existingUrls = new Set(
      db.prepare("SELECT linkedin_url FROM leads WHERE linkedin_url IS NOT NULL AND user_id = ?").all(req.userId).map(l => l.linkedin_url)
    );

    const preview = profiles.slice(0, 25).map(p => {
      const pubId = p.public_identifier || p.username || '';
      const url = pubId ? `https://www.linkedin.com/in/${pubId}` : (p.linkedin_url || '');
      return {
        full_name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || p.name || 'Unknown',
        headline: p.headline || p.occupation || '',
        company: p.company || p.current_company?.name || '',
        location: p.location || p.geo_location || '',
        linkedin_url: url,
        linkedin_member_id: p.id || p.member_id || p.linkedin_member_id || '',
        profile_photo_url: p.profile_picture_url || p.photo_url || '',
        is_duplicate: url ? existingUrls.has(url) : false,
      };
    });

    res.json({ success: true, data: preview, total_found: profiles.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const { status, notes, tags, ai_score, campaign_id } = req.body;
    const now = new Date().toISOString();

    // Verify campaign belongs to user if updating campaign_id
    if (campaign_id && campaign_id !== lead.campaign_id) {
      const campaignCheck = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(campaign_id, req.userId);
      if (!campaignCheck) return res.status(400).json({ success: false, error: 'Invalid campaign ID' });
    }

    db.prepare(
      `UPDATE leads SET
        status = ?, notes = ?, tags = ?, ai_score = ?, campaign_id = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      status ?? lead.status,
      notes ?? lead.notes,
      tags ? JSON.stringify(tags) : lead.tags,
      ai_score ?? lead.ai_score,
      campaign_id ?? lead.campaign_id,
      now,
      req.params.id,
      req.userId
    );

    const updated = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/status', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = [
      'pending_connection', 'connection_sent', 'connected',
      'jd_sent', 'follow_up_sent', 'replied', 'shortlisted', 'not_interested'
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    db.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
      status, new Date().toISOString(), req.params.id, req.userId
    );

    const updated = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/mark-replied', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const score = calculateScore({
      ...lead,
      reply_received: 1
    });

    db.prepare(
      "UPDATE leads SET reply_received = 1, reply_received_at = ?, status = 'replied', fit_score = ?, updated_at = ? WHERE id = ? AND user_id = ?"
    ).run(now, now, score, now, req.params.id, req.userId);

    const updated = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/bulk-update', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const { ids, status, campaign_id, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();

    if (action === 'delete') {
      const campaignDistribution = db.prepare(
        `SELECT campaign_id, COUNT(*) as count FROM leads WHERE id IN (${placeholders}) AND user_id = ? GROUP BY campaign_id`
      ).all(...ids, req.userId);

      db.transaction(() => {
        // 1. Decrement campaign total_leads counters
        for (const dist of campaignDistribution) {
          if (dist.campaign_id) {
            db.prepare('UPDATE campaigns SET total_leads = MAX(0, total_leads - ?) WHERE id = ? AND user_id = ?')
              .run(dist.count, dist.campaign_id, req.userId);
          }
        }

        // 2. Delete associated activity logs
        db.prepare(`DELETE FROM activity_log WHERE lead_id IN (${placeholders}) AND user_id = ?`).run(...ids, req.userId);

        // 3. Delete the leads
        db.prepare(`DELETE FROM leads WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, req.userId);
      })();

      return res.json({ success: true, message: `Deleted ${ids.length} leads and updated counters successfully` });
    }

    if (action === 'add_tag') {
      const { tag } = req.body;
      if (!tag) return res.status(400).json({ success: false, error: 'tag string is required' });

      const leads = db.prepare(`SELECT id, tags FROM leads WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, req.userId);
      const transaction = db.transaction(() => {
        for (const lead of leads) {
          let currentTags = [];
          try {
            if (lead.tags) currentTags = JSON.parse(lead.tags);
          } catch (_) {}

          if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            db.prepare('UPDATE leads SET tags = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(currentTags), now, lead.id);
          }
        }
      });
      transaction();
      return res.json({ success: true, message: `Added tag "${tag}" to selected leads` });
    }

    if (action === 'remove_tag') {
      const { tag } = req.body;
      if (!tag) return res.status(400).json({ success: false, error: 'tag string is required' });

      const leads = db.prepare(`SELECT id, tags FROM leads WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, req.userId);
      const transaction = db.transaction(() => {
        for (const lead of leads) {
          let currentTags = [];
          try {
            if (lead.tags) currentTags = JSON.parse(lead.tags);
          } catch (_) {}

          if (currentTags.includes(tag)) {
            currentTags = currentTags.filter(t => t !== tag);
            db.prepare('UPDATE leads SET tags = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(currentTags), now, lead.id);
          }
        }
      });
      transaction();
      return res.json({ success: true, message: `Removed tag "${tag}" from selected leads` });
    }

    if (status) {
      db.prepare(`UPDATE leads SET status = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(status, now, ...ids, req.userId);
    }

    if (campaign_id) {
      const campaignCheck = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(campaign_id, req.userId);
      if (!campaignCheck) return res.status(400).json({ success: false, error: 'Invalid campaign ID' });
      db.prepare(`UPDATE leads SET campaign_id = ?, updated_at = ? WHERE id IN (${placeholders}) AND user_id = ?`).run(campaign_id, now, ...ids, req.userId);
    }

    res.json({ success: true, message: `Updated ${ids.length} leads` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export', (req, res) => {
  try {
    const db = getDb();
    const { campaign_id, status } = req.query;

    let sql = 'SELECT * FROM leads WHERE user_id = ?';
    const params = [req.userId];
    if (campaign_id) { sql += ' AND campaign_id = ?'; params.push(campaign_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }

    const leads = db.prepare(sql).all(...params);
    const parser = new Parser({ fields: ['id', 'full_name', 'headline', 'company', 'designation', 'location', 'linkedin_url', 'status', 'reply_received', 'notes', 'created_at'] });
    const csv = parser.parse(leads);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/timeline', (req, res) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Prospect not found' });

    const logs = db.prepare(`
      SELECT al.*, a.name as account_name 
      FROM activity_log al 
      LEFT JOIN accounts a ON a.id = al.account_id 
      WHERE al.lead_id = ? 
      ORDER BY al.created_at ASC
    `).all(req.params.id);

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    db.transaction(() => {
      // 1. Delete associated activity logs
      db.prepare('DELETE FROM activity_log WHERE lead_id = ? AND user_id = ?').run(req.params.id, req.userId);

      // 2. Delete the lead
      db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);

      // 3. Decrement campaign total leads if assigned to a campaign
      if (lead.campaign_id) {
        db.prepare('UPDATE campaigns SET total_leads = MAX(0, total_leads - 1) WHERE id = ? AND user_id = ?')
          .run(lead.campaign_id, req.userId);
      }
    })();

    res.json({ success: true, message: 'Lead deleted and counters updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/recalculate', requireActiveSubscription, (req, res) => {
  try {
    const db = getDb();
    const weights = getScoringWeights();
    const leads = db.prepare('SELECT id, designation, headline, company, profile_json, reply_received FROM leads WHERE user_id = ?').all(req.userId);
    
    let updatedCount = 0;
    const updateStmt = db.prepare('UPDATE leads SET fit_score = ?, updated_at = ? WHERE id = ? AND user_id = ?');

    const transaction = db.transaction(() => {
      const now = new Date().toISOString();
      for (const lead of leads) {
        const score = calculateScore(lead, weights);
        updateStmt.run(score, now, lead.id, req.userId);
        updatedCount++;
      }
    });

    transaction();
    res.json({ success: true, message: `Recalculated fit scores for ${updatedCount} lead(s).`, count: updatedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
