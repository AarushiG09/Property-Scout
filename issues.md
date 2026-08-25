# Project Issues & Task Breakdown: Property Scout

This document breaks down the development of the voice-first AI Property Scout into actionable, tracked issues based on [ProblemStatement.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/ProblemStatement.md), [Architecture.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/Architecture.md), and [ImplementationPlan.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/ImplementationPlan.md).

---

## Epic 1: Data Scraping, PII Scrubbing & Storage

### Issue 1.1: Rental Listing Data Scraper
*   **Description**: Write a scraper script (`scraper/scrape.ts`) to extract available property listings from `https://bengaluru.rent/`.
*   **Acceptance Criteria**:
    *   Scrapes rent, bedrooms, furnishing, amenities, society name, square footage, coordinates, and availability status.
    *   Excludes resident transparency pins marked "Not for rent". Only available pins are saved.
*   **Labels**: `scraper`, `data`

### Issue 1.2: PII Sanitizer Middleware
*   **Description**: Implement `piiSanitizer.ts` to redact owner and agent personal contact details from scraped text.
*   **Acceptance Criteria**:
    *   Regex/NER scrubbing strips phone numbers and email addresses.
    *   Ensures zero PII enters the database, logs, or frontend UI.
*   **Labels**: `backend`, `security`

### Issue 1.3: Structured Listings Database Schema
*   **Description**: Initialize local SQLite / PostgreSQL database and migration scripts (`backend/src/database.ts`).
*   **Acceptance Criteria**:
    *   Tables created for properties, coordinates, pricing, and availability.
    *   Indexed by BHK, rent, and geographic region.
*   **Labels**: `backend`, `database`

---

## Epic 2: RAG Knowledge Base & Ingestion Pipeline

### Issue 2.1: JSONL Parser & Record-Level Chunking
*   **Description**: Build parsing logic in `scraper/docs_ingestion.ts` to process files in the `RAG/` directory (`RAG/README.md`, `RAG/sources.jsonl`, `RAG/localities.jsonl`, `RAG/safety_sources.jsonl`).
*   **Acceptance Criteria**:
    *   Treats each complete JSON object as exactly one chunk (Record-Level Chunking).
    *   Bypasses character/sentence sliding-window splitting to keep claims coupled with citations.
*   **Labels**: `rag`, `ingestion`

### Issue 2.2: Vector Ingestion & Embedding Pipeline
*   **Description**: Integrate **`BAAI/bge-small-en-v1.5`** embedding model to index locality and safety records into ChromaDB / Pinecone.
*   **Acceptance Criteria**:
    *   Constructs an `embedding_text` string combining metadata (`id`, `locality`, `region`, `supported_topics`, `do_not_infer`) with content.
    *   Generates vectors using `BAAI/bge-small-en-v1.5` and preserves all metadata attributes in vector payloads.
*   **Labels**: `rag`, `ai`

---

## Epic 3: MCP Integration & Backend Orchestrator

### Issue 3.1: OpenStreetMap MCP Client Setup
*   **Description**: Connect `@modelcontextprotocol/sdk` to the `open-streetmap-mcp` server (`backend/src/mcpClient.ts`).
*   **Acceptance Criteria**:
    *   Queries nearby transit points (subway entrances, bus stops) and POIs around coordinates.
    *   Calculates distance calculations dynamically at query time.
*   **Labels**: `mcp`, `backend`

### Issue 3.2: LLM Conversational Agent (Gemini 3.6 Flash)
*   **Description**: Build the LLM Orchestrator agent loop (`backend/src/agent.ts`) using Gemini 3.6 Flash.
*   **Acceptance Criteria**:
    *   Collects preferences conversationally (budget, bedrooms, must-haves, commute-anchor point).
    *   Asks max 5 clarifying questions before generating shortlist.
    *   Handles voice shortlist refinement commands (e.g. "Drop anything above 40k").
*   **Labels**: `backend`, `llm`

### Issue 3.3: RAG Retrieval Policy & Grounding Controller
*   **Description**: Implement query routing rules and grounding checks for neighborhood questions.
*   **Acceptance Criteria**:
    *   Triggers RAG retrieval *only* for character, history, guidance, or explanation queries.
    *   Blocks RAG for current prices, availability, or distance math (defers to MCP).
    *   Safety queries (`RAG/safety_sources.jsonl`) produce non-binary responses.
    *   Returns "verified information is unavailable" when evidence is lacking.
*   **Labels**: `backend`, `rag`, `security`

---

## Epic 4: Companion UI & Dual-Mode Agent Portal

### Issue 4.1: Application Shell & Buy/Sell Mode Toggle
*   **Description**: Build main layout in `frontend/src/App.tsx` featuring tabbed navigation between **Buy** and **Sell** modes.
*   **Acceptance Criteria**:
    *   Seamless switching between Buy and Sell views while maintaining isolated state.
*   **Labels**: `frontend`, `ui`

### Issue 4.2: Buy Mode View Components
*   **Description**: Build the Buy tab interface (`frontend/src/components/BuyTab.tsx`).
*   **Acceptance Criteria**:
    *   Shortlist cards grid displaying rent, BHK, and amenities.
    *   Neighborhood snapshot sidebar powered by OSM MCP transit data.
    *   Sticky mic control button + real-time transcription overlay (`useAudio.ts`).
    *   Sources/References drawer resolving source IDs to URLs via `RAG/sources.jsonl`.
    *   Visit-confirmation panel with slot picker and confirmation code display.
*   **Labels**: `frontend`, `ui`

### Issue 4.3: Sell Mode Guided Listing Wizard
*   **Description**: Build the 5-step property listing wizard (`frontend/src/components/SellTab.tsx`).
*   **Acceptance Criteria**:
    *   Step 1: Property Metadata (BHK, Type).
    *   Step 2: Location details & address coordinates.
    *   Step 3: Pricing terms.
    *   Step 4: Media/Photo uploads.
    *   Step 5: Contact details & PII verification submission screen with post-submission guidance.
*   **Labels**: `frontend`, `ui`

### Issue 4.4: Responsive Footer & Navigation Bar
*   **Description**: Build static footer component (`frontend/src/components/Footer.tsx`).
*   **Acceptance Criteria**:
    *   Fixed at the bottom of the page across Buy and Sell views.
    *   Clickable links/modals for **About Us**, **Contact Us**, **Terms & Conditions**, **Privacy Policy**, and **FAQs**.
    *   Fully responsive across mobile, tablet, and desktop viewports.
*   **Labels**: `frontend`, `ui`

---

## Epic 5: n8n Workflow Automation

### Issue 5.1: Webhook Trigger & PDF Generator
*   **Description**: Set up n8n workflow receiving shortlist JSON payloads via webhook and converting them into PDF summaries.
*   **Acceptance Criteria**:
    *   Generates print-ready PDF containing shortlisted listings, property images, and commute summaries.
*   **Labels**: `automation`, `n8n`

### Issue 5.2: Email Delivery Service
*   **Description**: Configure SMTP / Resend node in n8n to send PDF reports to user emails.
*   **Acceptance Criteria**:
    *   Delivers email with attached PDF; ensures no PII is leaked in body or attachment.
*   **Labels**: `automation`, `n8n`

---

## Epic 6: AI Evaluation Suites

### Issue 6.1: Feasibility Evaluation Test
*   **Description**: Implement automated feasibility verification (`evals/feasibility.test.ts`).
*   **Acceptance Criteria**:
    *   Asserts shortlist matches user budget, BHK requirements, and commute anchor points.
*   **Labels**: `evals`, `testing`

### Issue 6.2: Edit Correctness Evaluation Test
*   **Description**: Implement shortlist refinement validation (`evals/editCorrectness.test.ts`).
*   **Acceptance Criteria**:
    *   Verifies that a voice edit (e.g. "Drop above 40k") modifies only matching properties without altering unrelated listings.
*   **Labels**: `evals`, `testing`

### Issue 6.3: Grounding & Hallucination Evaluation Test
*   **Description**: Implement RAG citation and hallucination validation (`evals/grounding.test.ts`).
*   **Acceptance Criteria**:
    *   Cross-checks output claims against RAG context and OSM MCP records; fails if claims lack valid source citations.
*   **Labels**: `evals`, `testing`
