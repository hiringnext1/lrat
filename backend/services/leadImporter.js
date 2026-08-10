/**
 * Background lead import (LinkedIn search URL → leads).
 *
 * This used to be an inline closure inside routes/leads.js with the pagination
 * cursor held only in memory, so a deploy or crash killed the import silently
 * and left the job stuck on 'processing' forever with no way to resume.
 *
 * The cursor and target are now persisted on every batch, and startupRecovery()
 * in services/automation.js resumes anything still marked 'processing' on boot.
 */
const { getDb } = require('../config/database');
const unipile = require('./unipile');
const { calculateScore, getScoringWeights } = require('./leadScoring');

const BATCH_MIN_WAIT_SECS = 45;
const BATCH_MAX_WAIT_SECS = 90;

// Jobs already running in this process — prevents a resume from double-starting
const activeJobs = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function markJob(db, jobId, fields) {
  const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE sourcing_jobs SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(...Object.values(fields), jobId);
}

/**
 * Runs (or resumes) an import job. Fire-and-forget: callers do not await it.
 *
 * @param {object} opts
 * @param {number} opts.jobId            sourcing_jobs.id
 * @param {string} opts.searchUrl        LinkedIn search URL
 * @param {string} opts.unipileAccountId Unipile account used to search
 * @param {number} opts.campaignId
 * @param {number} opts.userId
 * @param {number} opts.targetCount      how many leads to import in total
 * @param {string|null} opts.startCursor  resume point (null = from the beginning)
 * @param {number} opts.alreadyImported   leads already imported by earlier runs
 * @param {object|null} opts.io           socket.io instance
 */
async function runImportJob({
  jobId, searchUrl, unipileAccountId, campaignId, userId,
  targetCount = 100, startCursor = null, alreadyImported = 0, io = null,
}) {
  if (activeJobs.has(jobId)) {
    console.log(`[Import] Job ${jobId} is already running in this process — skipping duplicate start.`);
    return;
  }
  activeJobs.add(jobId);

  const db = getDb();
  let currentCursor = startCursor;
  let totalImported = alreadyImported;
  let batchCount = 1;
  let hasMore = true;

  try {
    console.log(
      `[Import] ${startCursor ? 'Resuming' : 'Starting'} job ${jobId} (campaign ${campaignId}, target ${targetCount}, already ${alreadyImported})`
    );

    // Human-like initial delay before the first fetch
    await sleep(randomBetween(3, 8) * 1000);

    while (hasMore && totalImported < targetCount) {
      console.log(`[Import] Job ${jobId}: fetching batch ${batchCount}...`);
      await sleep(randomBetween(2, 5) * 1000); // pre-call jitter

      const result = await unipile.getProfilesFromSearchURL(searchUrl, unipileAccountId, currentCursor);

      if (!result.success) {
        const errMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : (result.error || 'Unipile connection error');
        console.error(`[Import] Job ${jobId} batch failed:`, errMsg);
        markJob(db, jobId, { status: 'failed', error_message: errMsg.slice(0, 300) });
        if (io) io.to('user_' + userId).emit('import_error', { campaign_id: campaignId, job_id: jobId, error: errMsg.slice(0, 200) });
        return;
      }

      const now = new Date().toISOString();
      const weights = getScoringWeights(userId);

      const transaction = db.transaction((profiles) => {
        let count = 0;
        const insertLead = db.prepare(
          `INSERT OR IGNORE INTO leads
            (full_name, headline, company, designation, location, linkedin_url, linkedin_member_id, profile_photo_url, campaign_id, user_id, fit_score, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const checkDuplicateId = db.prepare('SELECT id FROM leads WHERE linkedin_member_id = ? AND user_id = ?');

        for (const profile of profiles) {
          const linkedinUrl = profile.profile_url || profile.linkedin_url || profile.url || '';
          const memberId = profile.member_id || profile.id || '';
          if (!linkedinUrl || !memberId) continue;
          if (checkDuplicateId.get(memberId, userId)) continue;

          const designationStr = profile.job_title || profile.designation || profile.headline || '';
          const headlineStr = profile.headline || profile.title || '';
          const companyStr = profile.company_name || profile.company || '';
          const profileJsonStr = profile.profile_json || (profile.company_size ? JSON.stringify({ company_size: profile.company_size }) : null);

          const score = calculateScore({
            designation: designationStr, headline: headlineStr, company: companyStr,
            profile_json: profileJsonStr, reply_received: 0,
          }, weights);

          const res = insertLead.run(
            profile.full_name || profile.name || 'Unknown',
            headlineStr, companyStr, designationStr,
            profile.location || '', linkedinUrl, memberId,
            profile.profile_picture_url || profile.photo || '',
            campaignId, userId, score, now, now
          );
          if (res.changes > 0) count++;
        }

        if (count > 0) {
          db.prepare('UPDATE campaigns SET total_leads = total_leads + ? WHERE id = ? AND user_id = ?').run(count, campaignId, userId);
        }
        return count;
      });

      const batchImported = transaction(result.data);
      totalImported += batchImported;
      currentCursor = result.cursor;

      console.log(`[Import] Job ${jobId}: batch ${batchCount} done, ${batchImported} new (total ${totalImported}/${targetCount}).`);

      // Persist progress AND the cursor, so a restart can pick up here
      markJob(db, jobId, { total_imported: totalImported, cursor: currentCursor || null });

      if (io) {
        io.to('user_' + userId).emit('leads_updated', {
          campaign_id: campaignId, job_id: jobId,
          new_leads_count: batchImported, total_so_far: totalImported, status: 'processing',
        });
      }

      if (!currentCursor || result.data.length === 0) {
        hasMore = false;
        console.log(`[Import] Job ${jobId}: no more leads available.`);
      }

      if (totalImported < targetCount && hasMore) {
        const wait = randomBetween(BATCH_MIN_WAIT_SECS, BATCH_MAX_WAIT_SECS);
        console.log(`[Import] Job ${jobId}: waiting ${wait}s before batch ${batchCount + 1}...`);
        await sleep(wait * 1000);
        batchCount++;
      }
    }

    markJob(db, jobId, { status: 'completed' });
    if (io) io.to('user_' + userId).emit('leads_updated', { campaign_id: campaignId, job_id: jobId, status: 'completed', total: totalImported });
    console.log(`[Import] Job ${jobId} COMPLETED. Total imported: ${totalImported}`);
  } catch (err) {
    console.error(`[Import] Job ${jobId} critical error:`, err.message);
    try {
      markJob(db, jobId, { status: 'failed', error_message: String(err.message).slice(0, 300) });
      if (io) io.to('user_' + userId).emit('import_error', { campaign_id: campaignId, job_id: jobId, error: err.message });
    } catch (_) {}
  } finally {
    activeJobs.delete(jobId);
  }
}

/**
 * Resumes every job left on 'processing' by a crash or deploy.
 * Called from startupRecovery() once the server is up.
 */
function resumeInterruptedJobs(io = null) {
  const db = getDb();
  let resumed = 0;

  try {
    const stuck = db.prepare("SELECT * FROM sourcing_jobs WHERE status = 'processing' ORDER BY id DESC").all();
    if (stuck.length === 0) {
      console.log('[Import] Startup recovery: no interrupted import jobs.');
      return 0;
    }

    for (const job of stuck) {
      // Anything older than a day is not worth resuming — the search results moved on
      const ageMs = Date.now() - new Date((job.updated_at || job.created_at).replace(' ', 'T') + 'Z').getTime();
      if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
        markJob(db, job.id, { status: 'interrupted', error_message: 'Stopped by a server restart and too old to resume automatically — please run the import again.' });
        console.log(`[Import] Job ${job.id} marked interrupted (too old).`);
        continue;
      }

      const account = job.account_id
        ? db.prepare('SELECT unipile_account_id FROM accounts WHERE id = ? AND user_id = ?').get(job.account_id, job.user_id)
        : db.prepare("SELECT unipile_account_id FROM accounts WHERE user_id = ? AND is_active = 1 AND status = 'active' ORDER BY id LIMIT 1").get(job.user_id);

      if (!account || !job.search_url) {
        markJob(db, job.id, { status: 'interrupted', error_message: 'Stopped by a server restart and could not be resumed (no usable LinkedIn account) — please run the import again.' });
        console.log(`[Import] Job ${job.id} marked interrupted (no account).`);
        continue;
      }

      // Jobs created before target_count existed: resuming with a guessed target
      // would either stop immediately or import more than the user asked for.
      if (!job.target_count && (job.total_imported || 0) > 0) {
        markJob(db, job.id, { status: 'interrupted', error_message: 'Stopped by a server restart. The original lead target was not recorded, so it could not resume automatically — run the import again (already-imported leads are skipped).' });
        console.log(`[Import] Job ${job.id} marked interrupted (legacy row, unknown target).`);
        continue;
      }

      console.log(`[Import] Resuming interrupted job ${job.id} from cursor ${job.cursor ? 'saved' : 'start'} (${job.total_imported || 0} already imported).`);
      runImportJob({
        jobId: job.id,
        searchUrl: job.search_url,
        unipileAccountId: account.unipile_account_id,
        campaignId: job.campaign_id,
        userId: job.user_id,
        targetCount: job.target_count || 100,
        startCursor: job.cursor || null,
        alreadyImported: job.total_imported || 0,
        io,
      });
      resumed++;
    }
  } catch (err) {
    console.error('[Import] Startup recovery error:', err.message);
  }

  return resumed;
}

module.exports = { runImportJob, resumeInterruptedJobs };
