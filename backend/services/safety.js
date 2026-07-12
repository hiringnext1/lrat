const ABSOLUTE_MAX_DAILY = 25;
const ABSOLUTE_MAX_WEEKLY = 150;
const MIN_DELAY_MS = 120000;
const MAX_ACTIONS_PER_HOUR = 8;

/**
 * Returns a string representing the current time info (HH:MM) in target timezone
 */
function getISTTimeInfo(timezone = 'Asia/Kolkata') {
  const options = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const [{ value: hour }, , { value: minute }] = formatter.formatToParts(new Date());
  return { hour: parseInt(hour), minute: parseInt(minute) };
}

function getISTDateString(timezone = 'Asia/Kolkata') {
  const options = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

function getISTDayOfWeek(timezone = 'Asia/Kolkata') {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });
  const dayStr = formatter.format(new Date());
  const days = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };
  return days[dayStr];
}

function getSqliteTimezoneModifiers(timezone = 'Asia/Kolkata') {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const diffMs = tzDate.getTime() - utcDate.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const hours = Math.floor(Math.abs(diffMins) / 60);
  const mins = Math.abs(diffMins) % 60;
  const sign = diffMins >= 0 ? '+' : '-';
  return {
    hoursModifier: `${sign}${hours} hours`,
    minutesModifier: `${sign}${mins} minutes`
  };
}

function getISTTime(timezone = 'Asia/Kolkata') {
  const now = new Date();
  const dateString = now.toLocaleString("en-US", {timeZone: timezone});
  return new Date(dateString);
}

function getEffectiveDailyLimit(account) {
  const week = account.warmup_week;
  if (week === 0) return 0;
  if (week === 1) return 5;
  if (week === 2) return 10;
  if (week === 3) return 15;
  
  // Use randomized limit for the day if available, otherwise fallback to daily_limit
  const baseLimit = account.current_day_limit || account.daily_limit || 20;
  return Math.min(baseLimit, ABSOLUTE_MAX_DAILY);
}

function isWithinWorkingHours(startTime, endTime, timezone = 'Asia/Kolkata') {
  const { hour: curH, minute: curM } = getISTTimeInfo(timezone);
  const currentMinutes = curH * 60 + curM;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  // Commercial standard: allow wider window, trust user setting within reason
  const hardStart = 6 * 60; // 6:00 AM IST
  const hardEnd = 23 * 60;  // 11:00 PM IST

  const effectiveStart = Math.max(startMinutes, hardStart);
  const effectiveEnd = Math.min(endMinutes, hardEnd);

  return currentMinutes >= effectiveStart && currentMinutes <= effectiveEnd;
}

function isWeekday(timezone = 'Asia/Kolkata') {
  const dayNum = getISTDayOfWeek(timezone);
  return dayNum >= 1 && dayNum <= 5;
}

function isStrictWarmupPeriod(account) {
  if (!account.created_at) return false;
  const created = new Date(account.created_at).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return (Date.now() - created) < threeDaysMs;
}

function canSendConnection(account, campaign = null, db = null) {
  if (account.status !== 'active') {
    return { allowed: false, reason: `Account status is ${account.status}` };
  }
  if (!account.is_active) {
    return { allowed: false, reason: 'Account is disabled' };
  }

  const effectiveLimit = getEffectiveDailyLimit(account);
  if (effectiveLimit === 0) {
    return { allowed: false, reason: 'Warmup not started — set warmup_week to begin' };
  }
  if (account.today_connections >= effectiveLimit) {
    return { allowed: false, reason: `Daily limit reached (${account.today_connections}/${effectiveLimit})` };
  }
  if (account.today_connections >= ABSOLUTE_MAX_DAILY) {
    return { allowed: false, reason: `Absolute daily max reached (${ABSOLUTE_MAX_DAILY})` };
  }
  if (account.week_connections >= Math.min(account.weekly_limit || 150, ABSOLUTE_MAX_WEEKLY)) {
    return { allowed: false, reason: `Weekly limit reached (${account.week_connections})` };
  }

  // NEW: Check for next scheduled action time
  if (account.next_action_at) {
    const nextTime = new Date(account.next_action_at).getTime();
    if (Date.now() < nextTime) {
      const waitSecs = Math.ceil((nextTime - Date.now()) / 1000);
      const waitMins = Math.floor(waitSecs / 60);
      const remainingSecs = waitSecs % 60;
      return { allowed: false, reason: `Resting: ${waitMins}m ${remainingSecs}s left` };
    }
  }

  const startTime = campaign?.working_hours_start || '09:00';
  const endTime = campaign?.working_hours_end || '18:00';

  let timezone = 'Asia/Kolkata';
  if (db && (campaign?.user_id || account?.user_id)) {
    const userId = campaign?.user_id || account?.user_id;
    const user = db.prepare('SELECT timezone FROM users WHERE id = ?').get(userId);
    if (user?.timezone) {
      timezone = user.timezone;
    }
  }

  if (!isWithinWorkingHours(startTime, endTime, timezone)) {
    return { allowed: false, reason: `Outside working hours (${timezone})` };
  }

  return { allowed: true, reason: 'OK' };
}

function resetDailyCountsIfNeeded(db) {
  const nowIso = new Date().toISOString();

  // Join users on accounts to get timezone
  const accounts = db.prepare(`
    SELECT a.id, a.last_reset_at, a.daily_limit, u.timezone 
    FROM accounts a
    LEFT JOIN users u ON u.id = a.user_id
  `).all();

  let resetCount = 0;
  for (const acc of accounts) {
    const timezone = acc.timezone || 'Asia/Kolkata';
    const todayStr = getISTDateString(timezone);

    let needsReset = false;
    if (!acc.last_reset_at) {
      needsReset = true;
    } else {
      const lastResetDate = new Date(acc.last_reset_at);
      const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(lastResetDate);
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      const lastReset = `${year}-${month}-${day}`;

      if (lastReset < todayStr) {
        needsReset = true;
      }
    }

    if (needsReset) {
      resetCount++;
      const userLimit = acc.daily_limit || 20;
      const variation = Math.max(1, Math.floor(userLimit * 0.2));
      const randomOffset = Math.floor(Math.random() * (variation * 2 + 1)) - variation;
      const randomizedLimit = Math.max(1, Math.min(userLimit + randomOffset, ABSOLUTE_MAX_DAILY));

      db.prepare(
        `UPDATE accounts SET 
          today_connections = 0, 
          today_messages = 0, 
          current_day_limit = ?,
          last_reset_at = ? 
         WHERE id = ?`
      ).run(randomizedLimit, nowIso, acc.id);
    }
  }

  if (resetCount > 0) {
    console.log(`[Safety] Daily counts reset and randomized limits set for ${resetCount} accounts`);
    return resetCount;
  }
  return 0;
}

function resetWeeklyCountsIfNeeded(db) {
  const accounts = db.prepare(`
    SELECT a.id, a.week_connections, u.timezone 
    FROM accounts a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.week_connections > 0
  `).all();

  let resetCount = 0;
  for (const acc of accounts) {
    const timezone = acc.timezone || 'Asia/Kolkata';
    const dayNum = getISTDayOfWeek(timezone);
    if (dayNum === 1) { // Monday
      db.prepare('UPDATE accounts SET week_connections = 0 WHERE id = ?').run(acc.id);
      resetCount++;
    }
  }

  if (resetCount > 0) {
    console.log(`[Safety] Weekly counts reset for ${resetCount} accounts`);
    return resetCount;
  }
  return 0;
}

function checkAndHandleRestriction(account, errorData, db) {
  const errorStr = JSON.stringify(errorData || '').toLowerCase();
  const isRestricted =
    errorStr.includes('restrict') ||
    errorStr.includes('suspended') ||
    errorStr.includes('banned') ||
    errorStr.includes('challenge') ||
    errorStr.includes('blocked') ||
    errorStr.includes('resend_yet') ||
    errorStr.includes('provider limit');

  if (isRestricted) {
    console.log(`[Safety] Restriction detected for ${account.name}: ${errorStr}`);
    const resumeAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      "UPDATE accounts SET status = 'warning', is_active = 0, health_score = 50 WHERE id = ?"
    ).run(account.id);
    return { restricted: true, resumeAt };
  }
  return { restricted: false };
}

function updateAccountHealth(db, account, isSuccess) {
  if (isSuccess) {
    db.prepare(
      'UPDATE accounts SET consecutive_failures = 0, health_score = MIN(100, health_score + 1) WHERE id = ?'
    ).run(account.id);
  } else {
    const newFailures = (account.consecutive_failures || 0) + 1;
    let healthDrop = 5;
    if (newFailures > 3) healthDrop = 20;

    const newHealth = Math.max(0, (account.health_score || 100) - healthDrop);
    
    if (newFailures >= 5) {
      db.prepare(
        "UPDATE accounts SET status = 'paused', is_active = 0, consecutive_failures = ?, health_score = ? WHERE id = ?"
      ).run(newFailures, newHealth, account.id);
      console.log(`[Safety] Account ${account.name} AUTO-PAUSED due to 5 consecutive failures.`);
      return { paused: true };
    } else {
      db.prepare(
        'UPDATE accounts SET consecutive_failures = ?, health_score = ? WHERE id = ?'
      ).run(newFailures, newHealth, account.id);
    }
  }
  return { paused: false };
}

module.exports = {
  getEffectiveDailyLimit,
  canSendConnection,
  isWithinWorkingHours,
  isWeekday,
  resetDailyCountsIfNeeded,
  resetWeeklyCountsIfNeeded,
  checkAndHandleRestriction,
  updateAccountHealth,
  ABSOLUTE_MAX_DAILY,
  ABSOLUTE_MAX_WEEKLY,
  MIN_DELAY_MS,
  MAX_ACTIONS_PER_HOUR,
  getISTTime,
  getISTDateString,
  getISTDayOfWeek,
  getSqliteTimezoneModifiers,
};
