# 🚀 LRAT Production Setup — Manual Steps Guide

## ✅ Jo Pehle Se Ho Gaya
- [x] Fresh JWT_SECRET + ENCRYPTION_KEY generated
- [x] `.env.production` file created
- [x] `.gitignore` updated (secrets safe hain)
- [x] Frontend production build ✅ (clean, optimized, 0 errors)
- [x] Vite config updated (code splitting enabled)

---

## 📋 STEP 1: Stripe Products Setup (15-20 min)

### Dashboard Open Karo:
1. https://dashboard.stripe.com/test/products pe jaao (pehle TEST mode mein)
2. Baad mein live mode pe switch karna

### 3 Products Banao:

#### Product 1: Starter Playbook
| Field | Value |
|-------|-------|
| Name | Starter Playbook |
| Description | For sales & B2B teams — 1 LinkedIn account, 5 campaigns |
| Price 1 | $39.00 USD — Monthly recurring |
| Price 2 | $390.00 USD — Yearly recurring |

#### Product 2: Professional Engine  
| Field | Value |
|-------|-------|
| Name | Professional Engine |
| Description | For high-growth agencies — 3 LinkedIn accounts, 20 campaigns |
| Price 1 | $119.00 USD — Monthly recurring |
| Price 2 | $1,188.00 USD — Yearly recurring |

#### Product 3: Enterprise Cluster
| Field | Value |
|-------|-------|
| Name | Enterprise Cluster |
| Description | For volume sales teams — 10 LinkedIn accounts, unlimited campaigns |
| Price 1 | $349.00 USD — Monthly recurring |
| Price 2 | $3,490.00 USD — Yearly recurring |

### Price IDs .env.production mein paste karo:
```
STRIPE_PRICE_STARTER_MONTHLY=price_...    (Starter → Monthly price ID)
STRIPE_PRICE_STARTER_YEARLY=price_...     (Starter → Yearly price ID)
STRIPE_PRICE_PRO_MONTHLY=price_...        (Professional → Monthly price ID)
STRIPE_PRICE_PRO_YEARLY=price_...         (Professional → Yearly price ID)
STRIPE_PRICE_ENT_MONTHLY=price_...        (Enterprise → Monthly price ID)
STRIPE_PRICE_ENT_YEARLY=price_...         (Enterprise → Yearly price ID)
```

---

## 📋 STEP 2: Stripe Webhook Setup (5 min)

**⚠️ Ye tab karo jab production domain ready ho**

1. Stripe Dashboard → Developers → Webhooks → "Add endpoint"
2. Endpoint URL: `https://YOUR_DOMAIN.com/api/billing/webhook`
3. Events select karo:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Webhook add karne ke baad **Signing Secret** copy karo
5. `.env.production` mein paste karo: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 📋 STEP 3: Gmail SMTP Setup (5 min)

### Gmail App Password Banana:
1. https://myaccount.google.com/security pe jaao
2. **2-Step Verification** ON karo (agar nahi hai)
3. Search bar mein "App passwords" type karo
4. App: "Mail" select karo, Device: "Other" → "LRAT Server" type karo
5. **Generate** click karo
6. 16-character password milega (jaise: `abcd efgh ijkl mnop`)
7. Spaces HATA do → `abcdefghijklmnop`

### `.env.production` mein add karo:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=abcdefghijklmnop   ← 16-char app password (bina spaces)
```

### Test karo:
```bash
cd /Users/vishal/Desktop/Claude/Linkedin_Automate/lrat/backend
node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587,
  auth: { user: 'YOUR_EMAIL@gmail.com', pass: 'YOUR_APP_PASS' }
});
t.sendMail({ from: 'YOUR_EMAIL@gmail.com', to: 'YOUR_EMAIL@gmail.com', subject: 'LRAT Test', text: 'SMTP works!' })
  .then(() => console.log('✅ SMTP OK!'))
  .catch(e => console.error('❌ SMTP Error:', e.message));
"
```

---

## 📋 STEP 4: Unipile Keys + Webhook (5 min)

1. https://app.unipile.com → Settings → API Keys
   - `UNIPILE_API_KEY` copy karo
   - `UNIPILE_DSN` confirm karo (probably `https://api6.unipile.com:13337`)

2. Unipile → Settings → Webhooks → Add Webhook:
   - URL: `https://YOUR_DOMAIN.com/api/webhooks/unipile`
   - Events: `message.received`, `relation.updated`, `relation.created`, `account.status.updated`
   - Secret copy karo → `UNIPILE_WEBHOOK_SECRET` mein paste karo

---

## 📋 STEP 5: Nvidia API Key (2 min)

1. https://build.nvidia.com → Sign in
2. API Key → Generate → Copy
3. `.env.production` mein paste karo: `NVIDIA_API_KEY=nvapi_...`

---

## 📋 STEP 6: Railway Pe Deploy Karo

### Railway Setup:
```bash
# Railway CLI install
npm install -g @railway/cli

# Login
railway login

# Project banao
railway init

# Volume attach karo (SQLite ke liye ZARURI)
railway volume add --mount /app/backend/db

# Sab env vars set karo
railway variables set \
  NODE_ENV=production \
  PORT=3001 \
  JWT_SECRET=1a08d8bfe0a3a270826eb2f74b21e3d5e9386c3ecffc8319fb99aadf647dac9d \
  ENCRYPTION_KEY=a63d01be157b9ad79f0e822da4eab74502485c077ec233544204043064774514 \
  FRONTEND_URL=https://your-app.railway.app \
  UNIPILE_API_KEY=your_key \
  UNIPILE_DSN=https://api6.unipile.com:13337 \
  NVIDIA_API_KEY=your_key \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  SMTP_HOST=smtp.gmail.com \
  SMTP_PORT=587 \
  SMTP_USER=your@gmail.com \
  SMTP_PASS=your_app_password

# Deploy!
railway up
```

### Railway Start Command:
In Railway dashboard, Start Command set karo:
```
cd backend && node server.js
```

### Build Command:
```
cd frontend && npm install && npm run build
```

---

## 📋 STEP 7: Admin User Create Karo

Railway deploy ke baad, admin user banana:

```bash
railway run node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('./backend/db/lrat.db');
const hash = bcrypt.hashSync('YOUR_ADMIN_PASSWORD', 10);
db.prepare(\"INSERT OR REPLACE INTO users (email, password_hash, name, role, is_verified) VALUES (?, ?, ?, 'admin', 1)\")
  .run('admin@lrat.com', hash, 'Admin');
console.log('Admin user created!');
"
```

---

## 📋 STEP 8: Production Health Check

Sab set hone ke baad test karo:

```bash
# Health check
curl https://YOUR_DOMAIN.com/api/health

# Expected response:
# { "status": "ok", "database": "connected", "circuitBreakers": {...} }
```

---

## 🔑 Final .env.production Checklist

```
[ ] JWT_SECRET=1a08d8bfe0... ✅ (already generated)
[ ] ENCRYPTION_KEY=a63d01be... ✅ (already generated)
[ ] FRONTEND_URL=https://... ❌ (domain milne ke baad add karo)
[ ] UNIPILE_API_KEY=... ❌ (manual step)
[ ] UNIPILE_DSN=... ✅ (https://api6.unipile.com:13337)
[ ] UNIPILE_WEBHOOK_SECRET=... ❌ (deployment ke baad)
[ ] NVIDIA_API_KEY=... ❌ (manual step)
[ ] STRIPE_SECRET_KEY=... ❌ (manual step)
[ ] STRIPE_WEBHOOK_SECRET=... ❌ (deployment ke baad)
[ ] STRIPE_PRICE_*=... ❌ (Stripe Dashboard se price IDs)
[ ] SMTP_HOST=smtp.gmail.com ✅
[ ] SMTP_PORT=587 ✅
[ ] SMTP_USER=... ❌ (aapka Gmail)
[ ] SMTP_PASS=... ❌ (App Password)
```

---

## 🔐 IMPORTANT SECURITY HARDENING (FOR CUSTOM DOMAIN LAUNCH)
*Note to AI Agent: Jab user custom domain map kare aur full production launch kare, tab ye security steps implement aur verify zaroori hain:*

1. **Cloudflare Integration:** Domain DNS ko Cloudflare par shift karein (SSL/HTTPS forced, WAF protection, DDoS protection).
2. **SQLite Database Backups:** Backend par cron job schedule karein jo daily `backend/db/lrat.db` ko AWS S3 ya external secure storage par upload kare.
3. **LinkedIn Proxy Configuration:** Unipile accounts connect karte waqt proxy setting compulsory karein, taaki user ka LinkedIn block na ho.
4. **Token Expiry Audit:** JWT secret rotation process set karein aur validation intervals audit karein.

