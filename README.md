# Property Scout 🏢🎙️
### Voice-First AI Real Estate Scout for Bengaluru

**Property Scout** is an end-to-end, production-deployed Voice-First AI Real Estate Scout built for modern renters, buyers, and property owners in Bengaluru. Powered by **Gemini 3.6 Flash**, **BAAI/bge-small-en-v1.5 RAG Vector DB**, **OpenStreetMap MCP**, **Neural Edge-TTS**, **SQLite**, and **n8n Automation**, it delivers conversational property discovery, transit distance calculations, grounded locality guides, and site visit scheduling.

---

## 🌐 Official URLs Index

| Resource / Service | Description | Official URL |
| :--- | :--- | :--- |
| **Live Frontend Portal** | Production Web Application (Vercel) | [https://property-scout-phi.vercel.app/](https://property-scout-phi.vercel.app/) |
| **Live Backend API** | Production Server (Railway) | [https://property-scout-production-98fe.up.railway.app](https://property-scout-production-98fe.up.railway.app) |
| **Backend Health Check** | API System Status & Metrics | [https://property-scout-production-98fe.up.railway.app/api/health](https://property-scout-production-98fe.up.railway.app/api/health) |
| **GitHub Repository** | Official Source Code & CI/CD Pipeline | [https://github.com/AarushiG09/Property-Scout.git](https://github.com/AarushiG09/Property-Scout.git) |
| **Rental Data Source** | Primary Bengaluru Rental Data Provider | [https://bengaluru.rent](https://bengaluru.rent) |
| **OpenStreetMap API** | POI & Transit Distance Infrastructure | [https://www.openstreetmap.org](https://www.openstreetmap.org) |
| **Google Gemini AI** | LLM Orchestration Platform | [https://ai.google.dev](https://ai.google.dev) |
| **Gmail Security Portal** | App Password & SMTP Management | [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |

---

## 📚 Project Documentation Index

* 📑 **[Architecture.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/Architecture.md)** — Comprehensive System Architecture, Data Flows, and Sequence Diagrams.
* 📑 **[ImplementationPlan.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/ImplementationPlan.md)** — Phase-by-Phase Roadmap and Component Specifications.
* 📑 **[edge-case.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/edge-case.md)** — Defensive Handling for Web Audio, WebKit Abort Loops, RAG Chunking, PII Regex, and MCP Fallbacks.
* 📑 **[evals_report.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/evals_report.md)** — AI Evaluation Suite Report, Golden Dataset, Adversarial Benchmark, and 100% Target Scores.
* 📑 **[deployment_plan.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/deployment_plan.md)** — Railway (Backend) and Vercel (Frontend) Cloud Deployment Specification.

---

## ✨ Key Features & Technical Highlights

1. **Voice AI Conversational Assistant**:
   * Natural speech input via Web Speech API (`en-IN`).
   * High-definition voice synthesis using **Neerja (Neural Edge TTS)** with zero client voice degradation.
   * Auto-submits spoken queries after 2.0 seconds of silence.

2. **RAG Vector Knowledge Base**:
   * Open-source **`BAAI/bge-small-en-v1.5`** dense vector embeddings (384-dimensional).
   * Record-level chunking preserving metadata and source citations (`localities.jsonl`, `safety_sources.jsonl`).
   * Grounded answers for neighborhood history, character, safety, and development.

3. **Geospatial OpenStreetMap MCP Integration**:
   * Live POI and transit calculations for metro entrances, bus stops, schools, and hospitals.
   * Automatic Euclidean fallback distance math if external MCP connection times out.

4. **Automated Site Visit Scheduling Engine**:
   * 10 fixed Scout Agents (`Rajesh Kumar`, `Ananya Sharma`, etc.).
   * Slot booking with database-level `UNIQUE(broker_id, visit_date, time_slot)` race condition prevention.
   * Instant Google Calendar `.ics` invite generation & live email delivery.

5. **n8n Workflow & Owner Listing Confirmations**:
   * **Buyer Export**: Converts shortlisted properties into a formatted PDF report and emails it to the buyer.
   * **Owner Listing Confirmation**: Instantly sends confirmation emails to property owners upon listing publication via the Sell Tab.

---

## 🛠️ Local Development & Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file based on `.env.example`:
```env
PORT=4000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key
GMAIL_USER=aarushigrover18@gmail.com
GMAIL_PASS=your_gmail_app_password
```

### 3. Run Backend & Frontend Locally
```bash
# Start Backend Server (Port 4000)
npx tsx backend/src/server.ts

# Start Frontend Dev Server (Port 3000)
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/) in your browser!
