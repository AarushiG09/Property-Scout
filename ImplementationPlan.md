# Implementation Guide: Voice-First AI Property Scout

This document provides a step-by-step roadmap, directory structure, coding outlines, and verification procedures for implementing the Property Scout system as designed in [Architecture.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/Architecture.md) and specified by [ProblemStatement.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/ProblemStatement.md).

---

## 1. Directory Structure

We recommend a monorepo structure separating the Frontend client, Backend server, Data Scraper, and Evaluation suites:

```text
property-scout/
├── RAG/                      # RAG Knowledge Base Files
│   ├── README.md             # Broad metadata and guidelines
│   ├── sources.jsonl         # Source description catalog
│   ├── localities.jsonl      # Locality profile records
│   └── safety_sources.jsonl  # Public safety records
├── package.json
├── .gitignore
├── backend/                  # Orchestrator & API Layer
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts         # Fastify/Express Entrypoint
│       ├── mcpClient.ts      # OpenStreetMap MCP Client
│       ├── agent.ts          # LLM Orchestration & Prompt Manager
│       ├── database.ts       # Listings SQLite/PG Connections
│       ├── piiSanitizer.ts   # PII Regex & NER Scrubbing Utilities
│       └── config.ts         # Environment Variables Loader
├── frontend/                 # Companion UI & Agent Portal
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── BuyTab.tsx    # Shortlist cards, snapshot, references, microphone
│   │   │   ├── SellTab.tsx   # Step-by-step listing wizard
│   │   │   └── Footer.tsx    # Links (About Us, Contact Us, Terms, Privacy, FAQs)
│   │   ├── hooks/
│   │   │   └── useAudio.ts   # Web Audio / MediaRecorder Hook
│   │   ├── App.tsx           # Layout wrapper & Mode Toggle
│   │   └── main.tsx
├── scraper/                  # Cheerio / Puppeteer Data Scraping
│   ├── package.json
│   ├── scrape.ts             # bengalaru.rent scraper script
│   └── docs_ingestion.ts     # RAG document embedding script
└── evals/                    # AI Evaluation suites
    ├── feasibility.test.ts
    ├── editCorrectness.test.ts
    └── grounding.test.ts
```

---

## 2. Phase-by-Phase Implementation Roadmap

### Phase 1: Data Ingestion & PII Cleaning
1.  **Build the Scraper**: Write a scraper in `scraper/scrape.ts` that navigates to `https://bengaluru.rent/`.
    *   *Constraint*: Filter listings to select ONLY pins that are marked available. Exclude "Not for rent" transparency pins.
2.  **PII Filtering**: Pass listings through `piiSanitizer.ts`. Strip out owner names, phone numbers, and emails using regular expressions.
3.  **Database Migration**: Save the sanitized, available listings with their latitude, longitude, price, configuration (BHK), and amenities into a local SQLite database (`listings.db`).

### Phase 2: RAG Ingestion & Vector DB Setup
1.  **Load Knowledge Base Files**: Load local files `RAG/README.md`, `RAG/sources.jsonl`, `RAG/localities.jsonl`, and `RAG/safety_sources.jsonl`.
2.  **Parse and Validate**: Parse JSONL/Markdown records in `scraper/docs_ingestion.ts` without inventing or fabricating any data.
3.  **Implement Record-Level Chunking**:
    *   Treat each complete JSON record in `RAG/localities.jsonl` and `RAG/safety_sources.jsonl` as exactly one chunk.
    *   Do not use arbitrary character-based, sentence-based, or sliding-window splitting. This ensures each factual claim remains coupled with its citations.
4.  **Construct Ingestion Text & Metadata**:
    *   For each record, create an `embedding_text` field that combines the record's relevant metadata (e.g. `id`, `locality`, `region`, `supported_topics`, `do_not_infer`) with its content string.
    *   Preserve all metadata keys (`id`, `locality`, `region`, `sources`, `supported_topics`, `do_not_infer`) in the vector payload to guarantee complete traceability back to the original source.
5.  **Generate Embeddings**: Generate embeddings for the `embedding_text` fields using the **`BAAI/bge-small-en-v1.5`** embedding model, and store the vectors and payloads in the project's vector database (Chroma/Pinecone).

### Phase 3: Backend Server & MCP client Setup
1.  **MCP Integration**:
    *   Set up connection using `@modelcontextprotocol/sdk`.
    *   Connect to the local/remote `open-streetmap-mcp` server.
    *   Expose helper functions in `backend/src/mcpClient.ts` to find transit points and POIs around coordinates.
2.  **Conversational Agent & Retrieval Policy**:
    *   Initialize LLM agent (e.g. Gemini 3.6 Flash) and manage user preferences in a session object. Limit clarifying questions to 5.
    *   Implement **Retrieval Triggers**: Pull context from RAG only for neighborhood character, background, development, history, or neighborhood-level guidance.
    *   Enforce **Separation of Responsibilities**: Never query RAG for current listings, pricing, or distance calculations. Instead, use listings DB and **OpenStreetMap MCP**.
    *   Implement **Safety Query Logic**: When safety is queried, retrieve evidence from `RAG/safety_sources.jsonl` but do not emit binary "safe/unsafe" ratings. If evidence is lacking, state that verified information is unavailable.
    *   Implement **Grounding Enforcement**: Return a "verified information is unavailable" notification if the response is not fully supported by retrieved context. Surface source conflicts/disagreements transparently.
3.  **Orchestrator Endpoints**:
    *   `POST /api/query`: Receives transcript, extracts preferences, performs DB filter, triggers OSM MCP queries for commute distances, and generates grounded LLM replies.
    *   `POST /api/refine`: Modifies active filters based on user text (e.g. "Drop anything above 40k") and updates shortlist.

### Phase 4: Frontend Development (Agent UI)
1.  **Main Layout**: Write `frontend/src/App.tsx` containing the toggle bar for **Buy** and **Sell** modes.
2.  **Buy Component & UI Citations**:
    *   Build cards displaying rent, BHK, area, and key details.
    *   Build a details sidebar showing OSM transit distances and neighborhood RAG guides.
    *   Build a "Sources" / "References" panel that resolves source IDs from retrieved context to name/type/URL details mapped from `RAG/sources.jsonl`. Cite only the sources actually used in generation.
    *   Integrate a mic action button connecting to a browser Speech-To-Text API or a backend Whisper transcription call.
3.  **Sell Component**:
    *   Build a wizard (`SellTab.tsx`) with steps: (1) Configuration, (2) Address, (3) Expected Price, (4) Media Uploads, (5) Post-Submission verification screen.
4.  **Static Footer**:
    *   Build `Footer.tsx` containing links to About Us, Contact Us, Terms, Privacy Policy, and FAQs. Utilize modals or sliding drawers for desktop/mobile compliance.

### Phase 5: n8n Workflow Integration
1.  Set up an n8n container or cloud instance.
2.  Create a workflow with a **Webhook Trigger** node that receives shortlist listings.
3.  Add an **HTML to PDF** node to render a clean shortlist summary.
4.  Connect an **Email Sender** node (SMTP or Resend) to dispatch the PDF report.

### Phase 6: Testing & AI Evaluations
1.  Implement the run-time tests in the `/evals` directory.
2.  Verify:
    *   *Feasibility*: Shortlists do not violate constraints.
    *   *Edit Correctness*: A modification command like "Only pet-friendly" does not alter unrelated listings.
    *   *Grounding*: Verify every claim has a matching source citation link.

---

## 3. Core Code Outlines

### A. PII Sanitizer Outline (`piiSanitizer.ts`)
```typescript
export function sanitizeListingDescription(description: string): string {
  // Pattern to match common phone number shapes (e.g., +91-XXXXX-XXXXX, 9876543210)
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  
  // Pattern to match email patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Clean description
  return description
    .replace(phonePattern, "[REDACTED_CONTACT]")
    .replace(emailPattern, "[REDACTED_EMAIL]");
}
```

### B. MCP Client Setup (`mcpClient.ts`)
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(new URL("http://localhost:3001/sse"));
const mcpClient = new Client({ name: "property-scout-orchestrator", version: "1.0.0" });

export async function initMcp() {
  await mcpClient.connect(transport);
  console.log("Connected to OpenStreetMap MCP Server");
}

export async function fetchNearbyTransit(lat: number, lon: number) {
  // Call tool on the OSM MCP server
  return await mcpClient.callTool({
    name: "get_nearby_amenities",
    arguments: { latitude: lat, longitude: lon, amenity: "subway_entrance", radius: 1000 }
  });
}
```

### C. RAG Ingestion Pipeline Outline (`scraper/docs_ingestion.ts`)
```typescript
import * as fs from 'fs';
import * as readline from 'readline';
import { ChromaClient } from 'chromadb'; // Example client

interface LocalityRecord {
  id: string;
  locality: string;
  region: string;
  document_type: string;
  content: string;
  sources: string[];
  supported_topics: string[];
  do_not_infer: string[];
}

export async function ingestRAGDatabase(localitiesPath: string) {
  const chroma = new ChromaClient();
  const collection = await chroma.getOrCreateCollection({ name: "neighborhood_rag" });

  const fileStream = fs.createReadStream(localitiesPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    // 1. Record-Level Chunking (1 line = 1 chunk, no factual claim split from citations)
    const record: LocalityRecord = JSON.parse(line);
    
    // 2. Create combined embedding_text field
    const embeddingText = `Locality: ${record.locality}. Region: ${record.region}. ` +
      `Topics: ${record.supported_topics.join(', ')}. ` +
      `Restrictions: Do not infer ${record.do_not_infer.join(', ')}. ` +
      `Content: ${record.content}`;
    
    // 3. Generate embeddings using BAAI/bge-small-en-v1.5
    const vector = await getBgeEmbeddingModelCall(embeddingText);
    
    // 4. Preserve all metadata keys with each chunk
    await collection.add({
      ids: [record.id],
      embeddings: [vector],
      metadatas: [{
        id: record.id,
        locality: record.locality,
        region: record.region,
        sources: JSON.stringify(record.sources),
        supported_topics: JSON.stringify(record.supported_topics),
        do_not_infer: JSON.stringify(record.do_not_infer)
      }],
      documents: [record.content] // Keep chunk traceable and independently understandable
    });
  }
}

async function getBgeEmbeddingModelCall(text: string): Promise<number[]> {
  // Call to BAAI/bge-small-en-v1.5 embedding engine API or local transformer instance
  return []; // returns 384-dimension vector for bge-small
}
```

### D. Evaluation Runner Outline (`evals/editCorrectness.test.ts`)
```typescript
import { expect } from "chai";

describe("Edit Correctness Eval", () => {
  it("should ensure a price cap voice edit only removes over-budget listings", () => {
    const originalShortlist = [
      { id: 1, rent: 35000, BHK: 2 },
      { id: 2, rent: 45000, BHK: 2 },
      { id: 3, rent: 38000, BHK: 2 }
    ];

    // Simulating refinement engine execution for "Drop anything above 40k"
    const voiceCommand = "Drop anything above 40k";
    const updatedShortlist = originalShortlist.filter(item => item.rent <= 40000);

    // Assert that items 1 and 3 are intact and unchanged, and item 2 is removed
    expect(updatedShortlist.length).to.equal(2);
    expect(updatedShortlist.find(i => i.id === 1)).to.not.be.undefined;
    expect(updatedShortlist.find(i => i.id === 3)).to.not.be.undefined;
    expect(updatedShortlist.find(i => i.id === 2)).to.be.undefined;
  });
});
```

---

## 4. Verification & Testing Playbook

### Automated Tests
Run the evaluation test suite:
```bash
npm run test:evals
```

### Manual QA Checklist
1.  **Toggle Verification**: Switch between the *Buy* and *Sell* tabs. Ensure UI state is isolated.
2.  **Mic Transcription**: Click the mic button, speak a command, and verify that the live transcript appears instantly.
3.  **PDF/Email Test**: Refine a shortlist and click "Email PDF". Check the inbox and verify that:
    *   The email contains the PDF.
    *   No PII details are exposed in the PDF or the email body.
4.  **Footer check**: Scroll to the footer, click the Terms & Conditions and Privacy Policy links, and verify that they render correctly on mobile and desktop viewports.

---

## 5. Defensive Architecture & Edge Case Matrix

For a complete reference of all system failure modes, Web Audio browser constraints, RAG chunking rules, PII sanitization regexes, MCP timeouts, and n8n fallback mechanisms, consult [edge-case.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/edge-case.md).

