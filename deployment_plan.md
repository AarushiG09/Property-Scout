# Deployment Plan: Property Scout (Railway & Vercel)

This document provides a step-by-step deployment guide for deploying the **Property Scout** system to production using **Railway** (for the Node.js/TypeScript Backend Server) and **Vercel** (for the React/Vite Frontend Portal).

---

## 🏗️ Deployment Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL FRONTEND                        │
│          https://property-scout.vercel.app                  │
│  - React 18 + Vite Production Build                         │
│  - Route Rewrites (/api/* -> Railway Backend)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS API Calls (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      RAILWAY BACKEND                        │
│     https://property-scout-backend.up.railway.app           │
│  - Node.js / Express Server (Port $PORT)                   │
│  - SQLite Database (listings.db, rag_vectors.db)            │
│  - Gemini 3.6 Flash Orchestrator & RAG Engine               │
│  - Gmail SMTP & n8n Shortlist PDF Export Service            │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Backend Deployment on Railway

### 1.1 Prerequisites
* A [Railway.app](https://railway.app/) account connected to your GitHub profile.
* GitHub repository: `https://github.com/AarushiG09/Property-Scout.git`

### 1.2 Step-by-Step Railway Setup
1. Log in to [Railway Dashboard](https://railway.app/dashboard) and click **"New Project"**.
2. Select **"Deploy from GitHub repo"** and choose `AarushiG09/Property-Scout`.
3. Set the **Root Directory** or **Service Settings**:
   * **Root Directory**: `backend` (or keep root with build path `backend`).
   * **Build Command**: `npm install`
   * **Start Command**: `npx tsx src/server.ts`
4. Configure **Environment Variables** in Railway Dashboard under **Variables**:
   ```env
   PORT=4000
   NODE_ENV=production
   GEMINI_API_KEY=your_live_gemini_api_key
   GMAIL_USER=aarushigrover18@gmail.com
   GMAIL_PASS=your_gmail_app_password
   N8N_WEBHOOK_URL=http://localhost:5678/webhook/shortlist-pdf
   ```
5. Generate a Public Domain:
   * In Railway Service Settings $\rightarrow$ **Networking** $\rightarrow$ **Generate Domain**.
   * Copy your public Railway URL (e.g., `https://property-scout-backend.up.railway.app`).

---

## Part 2: Frontend Deployment on Vercel

### 2.1 Vercel Route Proxy Configuration (`frontend/vercel.json`)
To avoid CORS restrictions and support Single Page Application (SPA) routing, create a `vercel.json` file inside `frontend/`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://property-scout-backend.up.railway.app/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2.2 Step-by-Step Vercel Setup
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** $\rightarrow$ **"Project"**.
2. Import your GitHub repository: `AarushiG09/Property-Scout`.
3. Configure Project Settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Select `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add **Environment Variables** under Vercel Settings:
   ```env
   VITE_API_BASE_URL=https://property-scout-backend.up.railway.app
   ```
5. Click **"Deploy"**. Vercel will build the frontend assets and assign your domain (e.g., `https://property-scout.vercel.app`).

---

## Part 3: Post-Deployment Verification Checklist

1. **Health Check**:
   * Open `https://property-scout-backend.up.railway.app/api/health`.
   * Verify response: `{"status":"ok","totalListings":15,"ragChunks":76}`.
2. **Frontend UI Navigation**:
   * Open `https://property-scout.vercel.app`.
   * Test switching between **Buy Workspace** and **Sell Workspace**.
3. **Voice AI Assistant Query**:
   * Click **"Start Voice Assistant 🎙️"** or type a query: *"Find 2BHK in Koramangala under 40k"*.
   * Verify live property response and speech playback.
4. **Site Visit Booking & Email Delivery**:
   * Book a site visit appointment and confirm receipt of Google Calendar invite & iCal `.ics` email.
5. **Shortlist PDF Export**:
   * Click **"Email Shortlist PDF 📄"** and verify email delivery to `aarushigrover18@gmail.com`.
