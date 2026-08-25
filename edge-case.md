# Edge Case & Defensive Error Handling Guide: Voice-First AI Property Scout

This document details all potential corner cases, edge scenarios, system failure modes, and defensive mitigation strategies implemented across the Property Scout architecture.

---

## 1. Speech Recognition (STT) & Web Audio Edge Cases

| Scenario / Edge Case | Failure Risk | Defensive Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **Browser Permission Denied** | User blocks microphone access when prompted. | Detects `event.error === "not-allowed"` or `"service-not-allowed"`. Displays user-friendly error toast: *"Microphone permission denied. Please allow microphone access in your browser."* | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Unthrottled Abort Loop** | WebKit/Safari continuously fires `onend` and aborts recognition in an unthrottled loop. | Implements **Exponential Backoff** (1s, 1.5s, 2.25s, 3.375s, 5s) and a **Hard Circuit Breaker** (halting auto-recovery after 5 consecutive aborts). | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Stale WebKit Recognition Instance** | Calling `.start()` on a recycled `SpeechRecognition` instance throws `InvalidStateError`. | Implements a **Lazy Fresh Factory Pattern** (`createFreshRecognition()`) that instantiates a brand new `SpeechRecognition` object on every restart/retry. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Microphone Resource Contention** | SpeechRecognition and Web Audio `AudioContext` frequency analyzer conflict over `MediaStream` tracks. | `stopAudioAnalyzer()` explicitly stops all `MediaStream` tracks (`track.stop()`), disconnects the analyzer, and suspends `AudioContext` before `SpeechRecognition.start()` runs. Waveform visualizer attaches only inside `onstart`. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **User Manual Stop Override** | Background callbacks (`handleSpeechComplete`, `onend`) automatically restart mic after user manually clicks stop. | Introduces `isManualStopRef`. Clicking "Click to Finish" sets `isManualStopRef.current = true`, blocking all automatic restarts until user explicitly clicks start again. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |

---

## 2. Text-To-Speech (TTS) & Playback Edge Cases

| Scenario / Edge Case | Failure Risk | Defensive Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **Server TTS Network Failure** | Edge-TTS server endpoint times out or fails. | Implements seamless fallback to browser-native `window.speechSynthesis`, dynamically picking female Indian English voice profiles (e.g. Veena, Heera). | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Safari Audio Priming Lock** | iOS/Safari blocks autoplay audio without prior user gesture. | Implements one-time session unlock (`unlockAudioForSafari()`) playing a silent WAV payload on first user tap. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |
| **Silent Playback Stall** | Audio element reports playing but `currentTime` freezes. | 500ms heartbeat monitor checks if `currentTime` is stuck for 3 consecutive intervals (1.5s), triggering automatic recovery. | [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts) |

---

## 3. RAG Intelligence & Grounding Edge Cases

| Scenario / Edge Case | Failure Risk | Defensive Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **Unverified Locality Query** | User asks about an area not present in `localities.jsonl` (e.g., Sarjapur). | Agent politely informs user plainly without technical jargon: *"I don't have verified locality background data for Sarjapur right now, but I can help you search for available properties across Bengaluru!"* Never leaks terms like "RAG", "vector DB", or "index". | [agent.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/agent.ts) |
| **Off-Domain Queries** | User asks non-real-estate questions (e.g. sports, politics). | Agent strictly enforces domain scope: *"That topic is outside what I can help with. I am specialized in Bengaluru real estate rentals and neighborhood guidance."* | [agent.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/agent.ts) |
| **No Matching Listings** | User specifies impossible criteria (e.g. 3BHK in Koramangala under ₹15,000). | System returns 0 listings cleanly and suggests relaxing budget or widening locality filters. | [BuyTab.tsx](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/components/BuyTab.tsx) |

---

## 4. Database & Booking Edge Cases

| Scenario / Edge Case | Failure Risk | Defensive Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **All Brokers Fully Booked** | User attempts to book a slot when all 10 agents are occupied. | System evaluates broker schedule availability before confirming, returning friendly error: *"All 10 brokers are fully booked for 10:30 AM on 2026-08-25. Please choose another time slot."* | [brokerService.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/brokerService.ts) |
| **Double Booking Conflict** | Concurrent booking attempts for the same broker, date, and slot. | SQLite database enforces `UNIQUE(broker_id, visit_date, time_slot)` constraint to prevent race condition double-bookings. | [database.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/database.ts) |
| **Real-time Seller Listing Sync** | Seller posts property; buyer view shows stale data. | `POST /api/listings` instantly executes `insertSingleListing()`, making the property available to buyers and AI voice queries immediately. | [server.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/server.ts) |

---

## 5. Security, PII & Email Delivery Edge Cases

| Scenario / Edge Case | Failure Risk | Defensive Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- | :--- |
| **PII Exposure in Public Listings** | Owner submits description containing raw phone or email. | `piiSanitizer.ts` scrubs phone numbers (`[REDACTED_PHONE]`) and email addresses (`[REDACTED_EMAIL]`) prior to database ingestion. | [piiSanitizer.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/piiSanitizer.ts) |
| **n8n Container Offline** | Shortlist PDF webhook endpoint fails to connect. | `n8nWorkflow.ts` catches webhook timeout/error and seamlessly executes direct Nodemailer Gmail SMTP fallback delivery. | [n8nWorkflow.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/n8nWorkflow.ts) |
| **Secret Environment Key Exposure** | Pushing `.env` or OAuth credentials to public GitHub. | Strict `.gitignore` excludes `.env`, `Credential/`, `node_modules/`, and database binaries (`*.db`, `*-shm`, `*-wal`). | [.gitignore](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/.gitignore) |
