import { processUserQuery, UserPreferences } from "./agent";

async function runDirectBackendMultiTurnTest() {
  console.log("=================================================");
  console.log("   STEP 1: ISOLATED DIRECT BACKEND 5-TURN TEST   ");
  console.log("=================================================\n");

  const turns = [
    "2BHK in Koramangala under 40k",
    "What's the area like?",
    "Thank you",
    "Schedule a visit for the first one",
    "Actually make that 3pm instead"
  ];

  let currentPrefs: UserPreferences = { clarifyingQuestionsCount: 0 };

  for (let i = 0; i < turns.length; i++) {
    const turnNum = i + 1;
    const transcript = turns[i];
    console.log(`--- TURN ${turnNum} INPUT ---: "${transcript}"`);
    console.log(`[TURN ${turnNum} PREFS IN]`, currentPrefs);

    try {
      const result = await processUserQuery(transcript, currentPrefs);
      currentPrefs = result.preferences || currentPrefs;

      console.log(`[TURN ${turnNum} PREFS OUT]`, currentPrefs);
      console.log(`[TURN ${turnNum} RESPONSE]`, result.response_text);
      if (result.booking_intent_triggered) {
        console.log(`[TURN ${turnNum} BOOKING TRIGGERED] Target: ${result.target_listing?.title}`);
      }
      console.log(`[TURN ${turnNum} SHORTLIST COUNT] ${result.shortlist?.length || 0} listings\n`);
    } catch (e: any) {
      console.error(`[TURN ${turnNum} ERROR]`, e);
    }
  }
}

runDirectBackendMultiTurnTest();
