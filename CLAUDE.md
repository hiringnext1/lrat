# CLAUDE.md — Project Guide for Claude Code

## Project Architecture: LRAT (LinkedIn Recruiter Automation Tool)

LRAT is a full-stack automation platform built for managing multiple LinkedIn accounts, automated sequence campaigns, lead sourcing, and unified chat inbox.

- **Frontend:** React + Vite + Tailwind CSS (`/frontend`)
- **Backend:** Node.js + Express + SQLite (better-sqlite3) (`/backend`)
- **Integration APIs:** Unipile (LinkedIn API), NVIDIA NIM / Claude AI (Personalization), Stripe (Billing), Brevo/Gmail (SMTP)
- **Deployment Platform:** Railway (`lrat` service, domain: `https://growleadz.co`)

---

## 🚀 Common Commands

### Local Development
```bash
# Install all dependencies (root, backend, frontend)
npm run install-all

# Start full stack (backend on 3002, frontend on 5173)
npm run dev

# Start backend only
cd backend && node server.js

# Start frontend only
cd frontend && npm run dev
```

### Git Workflow
```bash
# Check status
git status

# Commit changes
git add .
git commit -m "your commit message"

# Push to GitHub main branch
git push origin main
```

### Railway Deployment & CLI Management
```bash
# Check Railway project connection & status
railway status

# Check Environment Variables on Railway
railway variables

# Set environment variables on Railway
railway variables --set "KEY=VALUE"

# Redeploy latest build on Railway
railway redeploy -y
```

---

## 🔑 Key Environment Variables

- `UNIPILE_API_KEY` (Required for Unipile API requests)
- `UNIPILE_DSN` (Unipile DSN URL, e.g., `https://api34.unipile.com:16465`)
- `JWT_SECRET` (Required for authentication tokens)
- `ENCRYPTION_KEY` (Used for encrypting sensitive settings in SQLite DB)
- `FRONTEND_URL` (`https://growleadz.co` for production, `http://localhost:5173` for dev)

---

## 📂 Project Structure

```
lrat/
├── backend/
│   ├── config/          # Database configuration & settings (database.js)
│   ├── db/              # SQLite database storage (lrat.db)
│   ├── middleware/      # Auth, planGuard, validation
│   ├── routes/          # API routes (accounts, leads, campaigns, webhooks, etc.)
│   ├── services/        # Unipile, AI, Safety, Lead Scoring, Billing
│   └── server.js        # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # Modals, LeadTable, ConnectLinkedInModal, etc.
│   │   ├── pages/       # Dashboard, Accounts, Campaigns, Inbox, Settings
│   │   └── App.jsx      # Router & main app wrapper
└── CLAUDE.md
```
