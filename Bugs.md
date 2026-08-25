# Property Scout — Known Bugs & Resolution Log

This document tracks all identified software bugs, TypeScript compilation errors, runtime failures, and their resolution status across the Property Scout codebase.

---

## Bug Index & Status Summary

| Bug ID | Title / Summary | Affected File | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | TypeScript `unknown` Spread & Property Access Error in `getAllAvailableListings` | `backend/src/database.ts` | **High** | ✅ **FIXED** |
| **BUG-002** | Contraction Mispronunciation in Neural TTS (`"it's"` $\rightarrow$ `"it ES"`) | `backend/src/server.ts` | **Medium** | ✅ **FIXED** |
| **BUG-003** | End-of-Speech Auto-Submit Silence Timer Cancellation on `rec.onend` | `frontend/src/components/BuyTab.tsx` | **High** | ✅ **FIXED** |
| **BUG-004** | "Filter By Area" Unspecified Locality Reverting to Generic Response | `backend/src/agent.ts` | **High** | ✅ **FIXED** |

---

## Bug Details & Resolutions

### BUG-001: TypeScript `unknown` Spread Error in `getAllAvailableListings()`

*   **File Location**: [database.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/database.ts#L100-L104)
*   **Error Description**:
    ```text
    backend/src/database.ts(101,5): error TS2698: Spread types may only be created from object types.
    backend/src/database.ts(102,27): error TS18046: 'r' is of type 'unknown'.
    ```
*   **Root Cause**: In `better-sqlite3`, `stmt.all()` returns elements of type `unknown[]`. Attempting to spread `...r` and read `r.amenities` directly without explicit type casting caused TypeScript strict mode compilation failures.
*   **Resolution Implemented**:
    1. Defined an explicit database row interface `ListingRow` and mapped return type `ParsedListing`.
    2. Cast `stmt.all() as ListingRow[]` before mapping row transformations.
    3. Added type-safe parsing for `amenities` stringified JSON arrays.
*   **Verification**: Executed `npx tsc --noEmit` and verified 0 TypeScript compilation errors. Executed `npx tsx scraper/scrape.ts` and confirmed runtime database query success.
*   **Status**: ✅ **Resolved**

---

### BUG-002: Contraction Mispronunciation in Neural TTS

*   **File Location**: [server.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/server.ts#L174)
*   **Error Description**: English contractions like `"it's"` were pronounced as `"it ES"`, `"you're"` as `"you RE"`, and `"I'll"` as `"I LL"`.
*   **Root Cause**: Naive regex sanitization `text.replace(/["'\\]/g, " ")` replaced single quotes/apostrophes with spaces (`"it s"`), causing the Neural TTS engine to spell out letters.
*   **Resolution Implemented**:
    1. Removed `.replace(/'/g, " ")` and normalized curly smart quotes (`’`, `‘`) to standard straight apostrophes (`'`).
    2. Passed TTS input via temporary text files (`/tmp/tts_input_*.txt`) using `python3 -m edge_tts --file`, preserving 100% of apostrophes and natural contractions.
*   **Status**: ✅ **Resolved**

---

### BUG-003: STT `rec.onend` Silence Timer Cancellation

*   **File Location**: [BuyTab.tsx](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/components/BuyTab.tsx#L122-L137)
*   **Error Description**: User spoke a query, but when speech ended, the mic froze and the text sat un-submitted in the input box, leaving the response box showing the previous turn's output.
*   **Root Cause**: Browser STT emitted `rec.onend` (setting `isListening = false`), which triggered React's `useEffect` cleanup (`clearTimeout(silenceTimerRef.current)`), cancelling the auto-submit timer right before it fired.
*   **Resolution Implemented**:
    1. Added immediate submission on `isListening === false` when `transcript` has unsubmitted text.
    2. Maintained `lastSubmittedQueryRef` to guarantee 100% auto-submit reliability across all turns.
*   **Status**: ✅ **Resolved**

---

### BUG-004: "Filter By Area" Unspecified Locality Reverting to Generic Response

*   **File Location**: [agent.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/backend/src/agent.ts#L220-L240)
*   **Error Description**: Saying "Filter by area for me" caused agent to revert to generic 1-property Bengaluru response instead of asking a clarifying question.
*   **Root Cause**: `agent.ts` intent classifier matched non-search preferences and fell back to default listing response template when `area` was missing.
*   **Resolution Implemented**: Added explicit clarifying question check for `q.includes("filter by area")` or `q.includes("filter area")` when no locality is specified.
*   **Status**: ✅ **Resolved**

---

### BUG-005: Un-Primed `ttsAudioRef` WebKit Hardware Audio Suppression & Autoplay Lockout

*   **File Location**: [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts#L225-L255)
*   **Error Description**: `speakText()` logged `[TTS PLAYBACK STARTED]` and `currentTime` advanced, but no audible sound came out of device speakers.
*   **Root Cause**: `unlockAudioForSafari()` primed `primingAudioRef`, but did NOT prime `ttsAudioRef` (the actual playback element) inside the user gesture handler. WebKit allows `.play()` to advance `currentTime` on un-primed media elements, but silently suppresses audio hardware output.
*   **Resolution Implemented**: Primed `ttsAudioRef` directly inside the initial click gesture handler in `unlockAudioForSafari()`. Added explicit volume `1.0`, `muted = false` checks, and 500ms `currentTime` progress monitoring.
*   **Status**: ✅ **Resolved**

---

### BUG-006: Unthrottled STT Restart Loop & System Degradation Protection

*   **File Location**: [useAudio.ts](file:///Users/aarushigrover/Desktop/Capstone%20project-%20Property%20Scout/frontend/src/hooks/useAudio.ts#L170-L195)
*   **Error Description**: Browser SpeechRecognition emitted `event.error = "aborted"` repeatedly, and `rec.onend` auto-recovery restarted recognition every 77ms–300ms without throttling, degrading browser performance.
*   **Root Cause**: 1) Re-requesting `getUserMedia` audio tracks during active STT caused OS/browser microphone track resets. 2) Auto-recover logic lacked exponential backoff and hard circuit breaker protection.
*   **Resolution Implemented**:
    1. Reused active `MediaStream` tracks in `startAudioAnalyzer()`, eliminating `getUserMedia` track re-allocations.
    2. Implemented exponential backoff delays (1000ms, 1500ms, 2250ms, 3375ms, 5000ms).
    3. Added a hard 5-attempt circuit breaker that halts auto-recovery and displays a friendly user UI notification if repeated browser errors occur.
*   **Status**: ✅ **Resolved**
