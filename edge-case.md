# Edge-Case & Defensive Error Handling Specification
## Voice-First AI Property Scout

This document provides a comprehensive mapping of all corner cases, failure modes, boundary conditions, and defensive mitigation strategies across the Property Scout system architecture as specified in [Architecture.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/Architecture.md) and implemented in [ImplementationPlan.md](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/ImplementationPlan.md).

---

## 1. Speech Recognition (STT) & Web Audio Edge Cases

| Architectural Component | Corner / Edge Case Scenario | System Failure Risk | Defensive Mitigation & Recovery Strategy | Source File / Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Web Audio Stream** | Browser permission denied by user (`not-allowed`, `service-not-allowed`). | STT engine fails silently; microphone visualizer crashes. | Catches `onerror` permission code. Displays clear UI alert toast: *"Microphone permission denied. Please allow microphone access in your browser."* | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **SpeechRecognition API** | Safari/WebKit infinite abort loop firing `onend` repeatedly. | Unthrottled restart loop freezes browser tab CPU. | Implements **Exponential Backoff** (1s, 1.5s, 2.25s, 3.375s, 5s) and a **Hard Circuit Breaker** (halting auto-recovery after 5 consecutive aborts). | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **SpeechRecognition API** | Recycled instance throws `InvalidStateError` on `.start()`. | Recognition fails to start on subsequent voice attempts. | Implements a **Lazy Fresh Factory Pattern** (`createFreshRecognition()`) that instantiates a brand new `SpeechRecognition` instance on every attempt. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Web Audio API** | AudioContext vs. SpeechRecognition microphone resource contention. | Chrome/Safari throw `AudioContext.createMediaStreamSource` type error when analyzer reads null stream. | `stopAudioAnalyzer()` explicitly stops all `MediaStream` tracks (`track.stop()`), disconnects nodes, suspends `AudioContext`, and validates active stream before setup. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Voice State Controls** | Automatic background callbacks restart mic after user clicks "Stop Listening". | User clicks mic button to finish, but system turns mic back ON automatically after TTS ends. | Introduces master `isManualStopRef`. Clicking "Click to Finish" sets `isManualStopRef.current = true`, locking mic OFF until explicit user re-activation. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |

---

## 2. Text-To-Speech (TTS) & Audio Playback Edge Cases

| Architectural Component | Corner / Edge Case Scenario | System Failure Risk | Defensive Mitigation & Recovery Strategy | Source File / Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Neural Edge-TTS API** | Server TTS endpoint times out, fails network call, or returns 500 error. | Assistant response is silent; user receives no voice output. | Implements seamless fallback to browser-native `window.speechSynthesis`, dynamically filtering female Indian English voice profiles (Veena, Heera, Ritu). | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Safari Autoplay Policy** | Safari/iOS blocks TTS audio playback without prior user gesture. | Audio `.play()` promise rejects with `NotAllowedError`. | Implements one-time session unlock (`unlockAudioForSafari()`) playing silent WAV payload on first user interaction to unlock HTMLAudioElement. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Audio Playback Stall** | HTMLAudioElement reports playing but `currentTime` remains frozen. | Audio output freezes indefinitely without triggering `onended`. | 500ms heartbeat monitor checks if `currentTime` is stuck for 3 consecutive intervals (1.5s), pausing audio and forcing speech completion fallback. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |

---

## 3. RAG Engine, Vector DB & Grounding Edge Cases

| Architectural Component | Corner / Edge Case Scenario | System Failure Risk | Defensive Mitigation & Recovery Strategy | Source File / Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **RAG Knowledge Ingestion** | Chunking splits factual claims from citations (`localities.jsonl`). | System hallucinates claims or cites invalid source IDs. | Enforces **Record-Level Chunking**: 1 complete JSON record = 1 chunk. Disables sentence/character sliding windows. Preserves all metadata keys. | [ragStore.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/ragStore.ts) |
| **Embedding Generator** | `BAAI/bge-small-en-v1.5` open-source model execution failure or empty string input. | Vector search fails or throws vector dimension mismatch error. | Validates non-empty text input, normalizes 384-dim vector arrays, and falls back to text token similarity search if embedding model is initializing. | [ragStore.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/ragStore.ts) |
| **Unverified Locality Query** | User asks about an unindexed neighborhood (e.g. Sarjapur). | LLM fabricates neighborhood details or outputs technical terms ("RAG", "vector DB"). | Detects unindexed locality. LLM system prompt instruction #5 forces plain-language response: *"I don't have verified locality data for Sarjapur right now..."* | [agent.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/agent.ts) |
| **Safety Queries** | User asks about safety (e.g. *"Is Indiranagar safe at night?"*). | System emits binary "safe/unsafe" judgment without evidence. | System prompt forbids binary safety ratings. Queries `RAG/safety_sources.jsonl` and emits evidence-backed statements with explicit source citations. | [agent.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/agent.ts) |
| **Contradictory RAG Sources** | Multiple RAG chunks report conflicting facts about a locality. | System silently picks one source or hallucinates compromise. | Grounding module surfaces source disagreement transparently: *"Source A indicates X, whereas Source B reports Y."* | [agent.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/agent.ts) |

---

## 4. OpenStreetMap MCP & Geospatial Edge Cases

| Architectural Component | Corner / Edge Case Scenario | System Failure Risk | Defensive Mitigation & Recovery Strategy | Source File / Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **MCP SSE Connection** | OpenStreetMap MCP server (`http://localhost:3001/sse`) disconnects or drops. | Distance math & transit queries crash orchestrator. | Implements connection timeout & fallback to Euclidean coordinate distance math: `sqrt((lat2-lat1)^2 + (lon2-lon1)^2) * 111km`. | [mcpClient.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/mcpClient.ts) |
| **Out-of-Bounds Coordinates** | Scraped listing coordinates fall outside Bengaluru bounding box (`12.8-13.1 N`, `77.4-77.7 E`). | Geodata query returns irrelevant points from other cities. | Validates geospatial bounding box; flags listings with out-of-bounds coordinates for default central Bengaluru reference point (`12.9716, 77.5946`). | [database.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/database.ts) |
| **Missing Transit POI** | No subway/metro station found within standard 1km search radius. | Transit math returns null or empty list. | Automatically expands search radius (1km $\rightarrow$ 3km) and queries secondary transit nodes (bus terminals, main arterial roads). | [mcpClient.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/mcpClient.ts) |

---

## 5. Database, Broker Scheduling & n8n Workflow Edge Cases

| Architectural Component | Corner / Edge Case Scenario | System Failure Risk | Defensive Mitigation & Recovery Strategy | Source File / Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **Broker Saturation** | All 10 agents fully booked for a requested date and time slot. | Double booking or unassigned site visit appointment. | `find_available_broker()` checks slot occupancy; if saturated (10/10 booked), returns clear message prompting user to select an alternative slot. | [brokerService.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/brokerService.ts) |
| **Booking Race Condition** | Concurrent users attempt to book the exact same broker & slot. | Database corruption or duplicate booking records. | SQLite schema enforces `UNIQUE(broker_id, visit_date, time_slot)` constraint. Prevents race conditions at database level. | [database.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/database.ts) |
| **n8n Container Offline** | Shortlist PDF webhook (`POST /webhook/shortlist-pdf`) times out or drops. | Shortlist export fails; buyer receives no PDF report. | `triggerN8nShortlistWorkflow()` catches webhook timeout/error and seamlessly executes direct Nodemailer Gmail SMTP fallback delivery. | [n8nWorkflow.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/n8nWorkflow.ts) |
| **Real-Time Seller Sync** | Seller submits property listing; buyer view shows stale results. | New property is invisible to buyer voice queries. | `POST /api/listings` instantly executes `insertSingleListing()`, making the property available to buyers and AI voice queries immediately. | [server.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/server.ts) |
| **PII Data Leakage** | Owner includes raw phone/email in property description. | Personal contact details logged publicly in database. | `piiSanitizer.ts` scrubs phone numbers (`[REDACTED_PHONE]`) and email addresses (`[REDACTED_EMAIL]`) prior to database ingestion. | [piiSanitizer.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/piiSanitizer.ts) |
| **Secret Exposure Risk** | Committing `.env` or OAuth credentials to public GitHub. | Sensitive API keys and credentials exposed. | `.gitignore` excludes `.env`, `Credential/`, `node_modules/`, and SQLite binaries (`*.db`, `*-shm`, `*-wal`). | [.gitignore](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/.gitignore) |

---

## 6. AI Evaluation Suite Edge Cases

| Evaluation Suite | Corner / Edge Case Scenario | Test Mechanism & Target Metric | Implementation File |
| :--- | :--- | :--- | :--- |
| **Feasibility Eval** | Voice query requests 2BHK under 40k; candidate shortlist includes 3BHK at 50k. | Rule-based constraint checker validates rent $\le$ 40,000 and BHK $=$ 2 for 100% of shortlisted items. Target: 100% compliance. | [testContinuous18Turns.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/testContinuous18Turns.ts) |
| **Edit Correctness Eval** | User says *"Drop anything above 35k"*; engine accidentally deletes a 30k listing. | Structural JSON diff compares shortlist before and after command. Verifies items under 35k are untouched and over 35k are dropped. Target: 0 unintended mutations. | [testContinuous18Turns.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/testContinuous18Turns.ts) |
| **Grounding & Hallucination Eval** | LLM outputs a claim about neighborhood transit distance without citing a source URL. | Verifies every factual claim maps to a valid source in `RAG/sources.jsonl`. Rejects responses lacking source citations. Target: 100% grounding. | [testContinuous18Turns.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/testContinuous18Turns.ts) |
