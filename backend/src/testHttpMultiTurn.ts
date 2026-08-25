import fetch from "node-fetch";

async function runHttpMultiTurnTest() {
  console.log("=================================================");
  console.log("   STEP 3: LIVE HTTP /api/query 5-TURN TEST     ");
  console.log("=================================================\n");

  const turns = [
    "2BHK in Koramangala under 40k",
    "What's the area like?",
    "Thank you",
    "Schedule a visit for the first one",
    "Actually make that 3pm instead"
  ];

  let sessionPreferences: any = { clarifyingQuestionsCount: 0, history: [] };

  for (let i = 0; i < turns.length; i++) {
    const turnNum = i + 1;
    const transcript = turns[i];
    console.log(`--- TURN ${turnNum} INPUT ---: "${transcript}"`);

    try {
      const res = await fetch("http://localhost:4000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          sessionPreferences
        })
      });

      const data: any = await res.json();
      sessionPreferences = data.preferences || sessionPreferences;

      console.log(`[TURN ${turnNum} HTTP STATUS] ${res.status}`);
      console.log(`[TURN ${turnNum} RESPONSE] "${data.response_text}"`);
      if (data.booking_intent_triggered) {
        console.log(`[TURN ${turnNum} BOOKING TRIGGERED] Target: "${data.target_listing?.title}"`);
      }
      console.log(`[TURN ${turnNum} HISTORY LEN] ${data.preferences?.history?.length || 0} messages\n`);
    } catch (e: any) {
      console.error(`[TURN ${turnNum} HTTP ERROR]`, e);
    }
  }
}

runHttpMultiTurnTest();
