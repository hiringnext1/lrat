# LRAT — LinkedIn Recruiter Automation Tool

A production-ready LinkedIn recruitment automation tool for managing 10–20 LinkedIn accounts, sending connection requests, sharing job descriptions, and following up with candidates — all on autopilot.

---

## What is LRAT?

LRAT automates your entire LinkedIn recruitment workflow:

1. **Import leads** from LinkedIn search URLs or CSV files
2. **Send connection requests** with AI-personalized notes (via Claude AI)
3. **Detect acceptances** and automatically send the job description
4. **Send 2 follow-ups** if there's no reply (day 3 and day 6)
5. **Detect replies** and notify you in real-time
6. **Unified inbox** to reply to all conversations from all accounts in one place
7. **Safety limits** hard-coded to protect your accounts from restrictions

---

## Prerequisites

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **Unipile account** with LinkedIn accounts connected — [unipile.com](https://www.unipile.com)
- **Anthropic account** for Claude AI — [console.anthropic.com](https://console.anthropic.com)

---

## Installation

### Step 1: Clone / download the project

```bash
cd /path/to/lrat
```

### Step 2: Install all dependencies

```bash
npm run install-all
```

This installs dependencies for root, backend, and frontend in one command.

### Step 3: Configure environment variables

Edit the `.env` file in the project root:

```env
UNIPILE_API_KEY=your_unipile_api_key_here
UNIPILE_DSN=https://api6.unipile.com:13337
CLAUDE_API_KEY=your_anthropic_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Step 4: Start the app

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) simultaneously.

### Step 5: Open in browser

```
http://localhost:5173
```

---

## Environment Variable Guide

| Variable | Where to find it | Notes |
|----------|-----------------|-------|
| `UNIPILE_API_KEY` | Unipile dashboard → API Keys | Keep secret |
| `UNIPILE_DSN` | Unipile dashboard → Settings | Usually `https://api6.unipile.com:13337` |
| `CLAUDE_API_KEY` | console.anthropic.com → API Keys | Keep secret |
| `PORT` | Your choice | Backend port, default 3001 |
| `FRONTEND_URL` | Your frontend URL | For CORS, default `http://localhost:5173` |

---

## How to Connect LinkedIn Accounts via Unipile

1. Log in to your [Unipile dashboard](https://www.unipile.com)
2. Go to **Accounts** → **Add Account** → Select **LinkedIn**
3. Follow the OAuth flow to connect each LinkedIn account
4. Once connected, come back to LRAT
5. Go to **Accounts** page → click **Sync Accounts**
6. Your LinkedIn accounts will appear in LRAT automatically

---

## How to Create Your First Campaign

1. **Sync accounts first** — Accounts page → Sync Accounts
2. Go to **Campaigns** → **New Campaign**
3. Fill in:
   - Campaign name (e.g., "Senior React Engineers — Bangalore")
   - Select which LinkedIn accounts to use
   - Paste your job description in the "JD Summary" field
   - Click **Generate with AI** buttons to auto-create message templates, or write your own
   - Set daily limit per account (recommend starting at 10 during warmup)
   - Set working hours and days
4. Click **Activate Campaign** (or Save as Draft)
5. Go to **Leads** page
   - Select your campaign and an account
   - Paste a LinkedIn search URL → click **Import URL**
   - Or upload a CSV with columns: `full_name`, `linkedin_url`, `designation`, `company`, `location`
6. The automation will start within 20 minutes (next cron tick)

---

## Understanding Safety Limits

These limits are **hard-coded** and cannot be changed:

| Rule | Limit |
|------|-------|
| Max connections per account per day | 25 |
| Max connections per account per week | 150 |
| Automation hours | 8 AM – 8 PM IST only |
| Minimum delay between actions | 2 minutes |
| Max actions per account per hour | 8 |
| Max follow-ups per lead | 2 (never sends a 3rd) |
| Duplicate protection | Same lead never contacted from 2 accounts |
| Auto-pause on restriction | 24 hours if LinkedIn flags account |

### Warmup Schedule (new accounts)

New accounts must go through warmup before hitting full limits:

| Week | Daily Limit |
|------|------------|
| 0 (not started) | 0 — automation blocked |
| 1 | 5 connections/day |
| 2 | 10 connections/day |
| 3 | 15 connections/day |
| 4+ (fully warmed) | Up to your set limit (max 25) |

To start warmup: Accounts page → click an account → **Start Warmup**.

---

## Troubleshooting

### "Failed to sync — check your Unipile API key"
- Verify your `UNIPILE_API_KEY` and `UNIPILE_DSN` in `.env`
- Make sure `.env` is in the root `/lrat/` folder, not inside `/backend/`
- Restart the server after changing `.env`

### "No leads imported"
- Check the LinkedIn search URL is a valid LinkedIn Sales Navigator or regular search URL
- Ensure the account selected has permissions to access LinkedIn via Unipile
- Check backend terminal for error details

### Accounts show "warning" status
- LinkedIn may have flagged the account
- The account is auto-paused for 24 hours
- After 24h it auto-resumes, or manually resume from Safety page

### Messages not sending
- Check that the campaign status is "active" (not draft/paused)
- Check that at least one account is assigned to the campaign
- Check that leads exist with status "pending_connection"
- Verify warmup has been started (warmup_week > 0)
- Check the Safety page for any account issues

### Claude AI not generating messages
- Verify `CLAUDE_API_KEY` in `.env`
- Check your Anthropic API quota/billing
- The system falls back to default templates if Claude fails

---

## CSV Import Format

Your CSV file should have these columns (header row required):

```csv
full_name,linkedin_url,designation,company,location,headline
John Smith,https://linkedin.com/in/johnsmith,Senior Engineer,TechCorp,Bangalore,Building scalable systems
```

Required: `full_name`, `linkedin_url`
Optional: `designation`, `company`, `location`, `headline`, `member_id`

---

## Deploy to Railway.app (24/7 Operation)

1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Initialize: `railway init` (in the `/lrat` folder)
5. Add environment variables in Railway dashboard (same as `.env`)
6. Add a build command: `npm run install-all`
7. Add a start command: `npm run server` (backend only on Railway)
8. Deploy frontend separately on Vercel or Netlify (point `FRONTEND_URL` to it)
9. Update `FRONTEND_URL` in Railway env vars to your deployed frontend URL

**Alternative**: Deploy the entire monorepo on a VPS (DigitalOcean, Hetzner) with PM2:
```bash
npm run install-all
npm install -g pm2
pm2 start "node backend/server.js" --name lrat-backend
pm2 start "cd frontend && npm run build && npx serve dist -p 5173" --name lrat-frontend
pm2 save
pm2 startup
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | SQLite via better-sqlite3 |
| Scheduler | node-cron |
| Real-time | Socket.io |
| LinkedIn API | Unipile |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Drag-drop | @hello-pangea/dnd |

---

## Support

This tool is for personal recruitment use. For issues or improvements, check the backend terminal logs — all automation events are logged in detail.
