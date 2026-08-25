import fetch from "node-fetch";

async function run4TurnPerformanceTest() {
  console.log("==========================================================");
  console.log("   VERIFYING 4 CONSECUTIVE TURNS (LATENCY & PIPELINE)    ");
  console.log("==========================================================\n");

  const queries = [
    "2BHK Koramangala under 40k",
    "What is the locality like?",
    "Thank you",
    "Schedule a visit for the first one"
  ];

  let sessionPreferences: any = { clarifyingQuestionsCount: 0, history: [] };

  for (let i = 0; i < queries.length; i++) {
    const turnNum = i + 1;
    const queryText = queries[i];
    console.log(`--- [TURN ${turnNum}] INPUT: "${queryText}" ---`);

    const turnStartTime = Date.now();

    // 1. /api/query Orchestration
    const queryRes = await fetch("http://localhost:4000/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: queryText, sessionPreferences })
    });
    const queryData: any = await queryRes.json();
    sessionPreferences = queryData.preferences || sessionPreferences;
    const queryDoneTime = Date.now();

    console.log(`[ORCHESTRATOR OK] Latency: ${queryDoneTime - turnStartTime}ms`);
    console.log(`[RESPONSE TEXT]: "${queryData.response_text.slice(0, 70)}..."`);

    // 2. /api/tts Speech Synthesis
    const ttsStartTime = Date.now();
    const ttsRes = await fetch("http://localhost:4000/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: queryData.response_text })
    });
    const ttsData: any = await ttsRes.json();
    const ttsDoneTime = Date.now();

    console.log(`[TTS SYNTHESIS OK] Latency: ${ttsDoneTime - ttsStartTime}ms, Bytes: ${ttsData.audioBase64?.length || 0}`);
    console.log(`[TOTAL PIPELINE] Total end-to-end backend latency: ${ttsDoneTime - turnStartTime}ms\n`);
  }
}

run4TurnPerformanceTest();
