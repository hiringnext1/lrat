# LRAT / GrowLeadz — Codebase Review (2026-08-04)

Full-stack LinkedIn outreach automation. Reviewed at commit `89b39cc` (branch clean, remote `git@github.com:hiringnext1/lrat.git`).
This doc is the **fast index** — read this instead of re-scanning the whole repo.

---

## 1. Layout & entry points

```
Linkedin_Automate/            # NOT a git repo (wrapper folder)
└── lrat/                     # git repo root
    ├── backend/   Express + better-sqlite3 + socket.io   (server.js, port 3001 default, dev docs say 3002)
    ├── frontend/  React 18 + Vite 5 + Tailwind 3         (port 5173, built to frontend/dist, served by Express)
    ├── scratch/   one-off debug scripts (gitignored)
    ├── railway.json  Railway deploy: `node backend/server.js`, healthcheck /api/health
    └── .env / .env.production  (gitignored, real secrets present locally)
```

| Layer | Files | Notes |
|---|---|---|
| Entry | `backend/server.js` (332) | JWT_SECRET hard-validated at boot, helmet, rate limits, routers, socket.io auth, graceful shutdown |
| DB/schema | `backend/config/database.js` (516) | schema + ~60 idempotent `ALTER TABLE` migrations + **startup data mutations** (see §3) + AES-256-GCM setting encryption |
| Automation engine | `backend/services/automation.js` (1082) | 5 loops: connections, enrichment, acceptances, flow execution, replies |
| Safety | `backend/services/safety.js` (327) | warmup tiers, daily/weekly caps, working-hours/timezone, health score |
| LinkedIn API | `backend/services/unipile.js` (439) | Unipile v1; invite/message/relations/chats/profile/posts |
| AI | `backend/services/nvidia.js` (317) | NVIDIA NIM `meta/llama-3.1-70b-instruct`; every function has a non-AI fallback |
| Routes | `backend/routes/*.js` (13 files, ~90 endpoints) | auth, accounts, campaigns, leads, inbox, analytics, settings, automation, billing(Stripe), admin, blacklist, webhooks |
| Middleware | authMiddleware (JWT), adminMiddleware, planGuard, validation (zod) | |
| Frontend | `src/pages/*` (16), `src/components/*` (20) | `CampaignBuilder.jsx` 2079 lines & `Landing.jsx` 1709 lines are the giants |

Data model (SQLite): `users, accounts, campaigns, campaign_accounts, leads, activity_log, canned_messages, settings, billing_events, sourcing_jobs, blacklist, pending_connections`.
Lead status machine: `pending_connection → connection_sent → connected → jd_sent → follow_up_sent → replied / not_interested / completed`.

## 2. Automation engine — how it actually runs

- `startAutomation(io)` (server boot) → `startupRecovery`, `startHeartbeatCheck` (unsticks `isRunning` flags after 20 min), `scheduleNextConnectionRun` (self-rescheduling `setTimeout` based on earliest `accounts.next_action_at`), plus cron:
  - `*/5 7-20 * * 1-5` acceptances, `*/5 7-22 * * *` replies, `*/2 * * * *` enrichment, `*/3 * * * *` flow execution (all TZ `Asia/Kolkata`).
- Per-account pacing lives in `accounts.next_action_at`; `randomDelay()` = **7–10 min** (`automation.js:154`) — docs/PROJECT_STATUS claim 15–28 min, **stale**.
- Two parallel outreach paths exist: legacy `runSendConnections()` (campaign templates) and the visual flow engine `runFlowExecution()/executeFlowNode()` (node types: trigger, delay, condition, invite, view_profile, like_post, tag, message, end). A campaign with `flow_json.nodes` uses the flow path; empty flow_json falls back to legacy.
- Real-time: `logStorage` (AsyncLocalStorage) carries `userId`, and a shadow `console` object emits `automation_log` to room `user_<id>`.

## 3. 🚨 Startup mutations in `config/database.js` (biggest landmine)

`initSchema()` runs on every boot and **rewrites user data**:

| Line | Statement | Effect |
|---|---|---|
| 331 | `UPDATE users SET plan_type='agency', plan_status='active', plan_accounts_limit=10 WHERE plan_accounts_limit < 10` | Every user becomes a paid agency account → **Stripe/planGuard enforcement is dead** |
| 417-419 | force `working_hours_start='00:00'`, end `'23:59'`, `working_days='[0..6]'` | User-configured campaign schedules are **wiped on each restart** |
| 455 | `UPDATE accounts SET warmup_week=4 WHERE is_active=1 AND status='active'` | Warmup ramp bypassed; every account jumps to full speed |
| 466 | `DELETE FROM accounts WHERE is_active=0 AND status='paused'` | `pauseAccountTemporarily()` and the 5-failure auto-pause set exactly `is_active=0, status='paused'` → **a restart deletes paused accounts** (and their `campaign_accounts` rows) |
| ~~380/384/390~~ | ~~seeds hardcoded `UNIPILE_API_KEY`, `UNIPILE_DSN`, `NVIDIA_API_KEY` into `settings`~~ | **FIXED in `9e11b44`** — seeds removed; env vars now win over `settings` rows (`BOOT_ENV` + `envValue()` in `database.js`). This seeding had pinned production to the dead `api52` Unipile instance and broke LinkedIn account linking (`503 errors/no_client_session`) |
| 399-411 | resets `admin@growleadz.co` / `admin@lrat.com` password to `Admin#GrowLeadz2026!` and `role='admin'` on every boot | Password changes never stick; credential in source |

Fixing these is prerequisite to anything billing-, schedule-, or warmup-related behaving as configured.

## 4. Security findings

1. **Hardcoded live credentials** in `config/database.js`. Unipile + NVIDIA seeds removed in `9e11b44`; the **admin password reset (`Admin#GrowLeadz2026!`) and the leaked NVIDIA key still need rotating** — both were committed to a GitHub repo. Config precedence is now: real env var → `settings` row → empty, with placeholder values (`placeholder`, `paste_your`, `none`) treated as unset.
2. **CORS is effectively open** — `server.js:74` and `:90` both `callback(null, true)`; `isOriginAllowed()` (`:65`) is dead code and also ends in `return true`.
3. **JWT accepted from `?token=` query** (`authMiddleware.js:16`) → tokens leak into proxy/access logs and Referer.
4. **No `app.set('trust proxy', …)`** while running behind Railway → `express-rate-limit` buckets all users under the proxy IP; login limiter (10/15 min) becomes a global throttle rather than per-IP.
5. **Webhook handler is not tenant-scoped** — `routes/webhooks.js:74` (`message.received`) and `:102-118` (`relation.updated`) look up leads by member_id / full name across **all users**; name-match fallback can attach another tenant's lead. Same gap in `automation.js:985` (`runCheckReplies`).
6. `planGuard.requireActiveSubscription` **fails open** (`next()` inside catch) — a DB error grants access.
7. `verifyUnipileSignature` **skips verification entirely** when `UNIPILE_WEBHOOK_SECRET` is unset/placeholder (`webhooks.js:13`).
8. `(user_id = ? OR user_id IS NULL)` appears in accounts/campaigns/inbox lookups — legacy NULL-owner rows are visible to every user.
9. Settings encryption only activates when `ENCRYPTION_KEY` is set; otherwise API keys sit in plaintext in `settings`.
10. Webhook new-account fallback (`webhooks.js:315`) assigns unmatched LinkedIn accounts to a hardcoded email pattern (`admin@growleadz.co` / `%jigar%` / `%vishal%`).

## 5. Correctness / reliability

- `pauseAccountTemporarily()` resumes via in-memory `setTimeout` — lost on restart; the 2-hour auto-resume sweep in `runSendConnections` partly covers it, but the §3 delete usually wins first.
- `runFlowExecution()` loads **every** in-flight lead for all users every 3 min, then does a campaign query per lead (N+1). Fine at hundreds of leads, not at tens of thousands.
- `getEffectiveDailyLimit()` returns 0 when `warmup_week=0` → account silently sends nothing (the §3 auto-fix exists precisely to paper over this; better: default `warmup_week` at account creation).
- Legacy JD path in `runCheckAcceptances` sends via `memberId` from the Unipile relation payload, not `lead.linkedin_member_id` — empty memberId silently no-ops.
- Circuit breakers deliberately treat 4xx as success; cooldowns are short (15 s / 10 s), so they mainly protect against hard outages.
- `campaigns.accepted` / `connections_sent` are denormalized counters incremented in several places and recomputed at boot — treat DB counters as approximate; `leads` is the source of truth.
- Cron windows (`7-20`, weekdays only for acceptances) contradict the forced 24/7 campaign hours; acceptance sync stops on weekends.
- SQLite file is `backend/db/lrat.db` (WAL). Railway **does** have volume `lrat-volume` (500 MB) mounted at `/app/backend/db`, state READY — so data survives deploys. Root-level `lrat.db` (0 bytes) is a stray file.
- No test suite. `backend/scripts/test_user_journey.js` and `scratch/*` are manual scripts; `scratch/` is gitignored and duplicates `backend/scripts/`.

## 6. Quality / maintainability

- `PROJECT_STATUS.md` is partly stale (delay timings, "100% complete") — verify against code before trusting.
- `automation.js` shadows global `console` to pipe logs to the socket; `global.console.*` is used where that's not wanted. Confusing but intentional.
- Duplicated flow logic between `runSendConnections` and `executeFlowNode:'invite'` (invite + error handling copy-pasted).
- Frontend: `CampaignBuilder.jsx` (2079) and `Landing.jsx` (1709) should be split; auth state lives in `localStorage` (`lrat_token`, `lrat_user`) with client-side-only route guards (server does enforce, so it's cosmetic).
- Mixed logging: pino (`services/logger.js`) in newer code, raw `console.*` in most routes.

## 6b. Deployment pipeline (verified 2026-08-04)

Railway project `lrat` → service `lrat` → env `production` (workspace "hiringnext1's Projects").
Domains: `growleadz.co` (custom) + `lrat-production.up.railway.app`. Volume `lrat-volume` (500 MB) at `/app/backend/db`.

**The service has NO GitHub source connected (`source: null`) — pushing to `origin/main` does not deploy anything.** Deploys are CLI-driven; the last one (2026-08-04 06:14 UTC) was a `railway redeploy` from the CLI.

```bash
git add . && git commit -m "..." && git push origin main   # sirf version control
railway up                                                  # actual deploy (local folder upload)
```

- `railway up` uploads the **current local working directory**, not the pushed git commit — uncommitted local changes go live, and commits that were pushed but never `railway up`-ed do not.
- `railway redeploy -y` rebuilds the last uploaded snapshot (does not pick up new code).
- One service serves both tiers: root `postinstall` runs `npm run build` for the frontend, and Express serves `frontend/dist`.
- Verify after deploy: `curl https://growleadz.co/api/health` (returns status/uptime/db/circuit-breaker state).
- To get real push-to-deploy, connect the GitHub repo in the Railway dashboard (Service → Settings → Source) — then `git push origin main` triggers the build automatically.

## 7. Suggested priority order

1. Delete/guard the destructive startup mutations in `database.js` (§3) — especially the paused-account `DELETE` and the plan upgrade.
2. Rotate the hardcoded Unipile/NVIDIA keys and the admin password; load from env only.
3. Scope webhook + reply lead lookups by `user_id` (join via `accounts.unipile_account_id → accounts.user_id`).
4. Lock CORS to `allowedOrigins`, drop `?token=`, add `app.set('trust proxy', 1)`.
5. Confirm the Railway volume for `backend/db/lrat.db`; otherwise plan the move to Postgres.
6. Make `planGuard` fail closed; require the Unipile webhook secret in production.
7. Reconcile docs (delay = 7–10 min, ports 3001 vs 3002) and add a smoke test around the lead status machine.
