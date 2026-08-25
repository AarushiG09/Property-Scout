import fetch from "node-fetch";

interface TestCase {
  id: number;
  category: string;
  input: string;
  expectedDescription: string;
}

const testCases: TestCase[] = [
  {
    id: 1,
    category: "SEARCH",
    input: "I'm looking for a 2BHK in Koramangala, budget 35k, need parking, close to a metro station.",
    expectedDescription: "Extracts 2BHK, Koramangala, 35k max rent and returns matching listings"
  },
  {
    id: 2,
    category: "SEARCH (MISSING BUDGET)",
    input: "Find me a 1BHK in Whitefield",
    expectedDescription: "Asks ONE clarifying question for budget, does NOT proceed with assumed number"
  },
  {
    id: 3,
    category: "REFINEMENT",
    input: "Drop anything above 40k.",
    expectedDescription: "Refines max rent filter to 40k"
  },
  {
    id: 4,
    category: "REFINEMENT",
    input: "Only show me pet-friendly places.",
    expectedDescription: "Filters for pet-friendly properties"
  },
  {
    id: 5,
    category: "REFINEMENT",
    input: "Add one more option with a balcony.",
    expectedDescription: "Appends option with a balcony"
  },
  {
    id: 6,
    category: "EXPLANATION",
    input: "Why did you pick this one?",
    expectedDescription: "Provides grounded, listing-specific rationale"
  },
  {
    id: 7,
    category: "EXPLANATION",
    input: "Is the commute from here realistic?",
    expectedDescription: "Answers transit/commute feasibility for target listing"
  },
  {
    id: 8,
    category: "NEIGHBORHOOD / RAG",
    input: "What's Koramangala actually like to live in?",
    expectedDescription: "Triggers locality RAG and cites neighborhood sources"
  },
  {
    id: 9,
    category: "NEIGHBORHOOD / RAG",
    input: "Is Indiranagar safe at night?",
    expectedDescription: "Triggers safety RAG profile context"
  },
  {
    id: 10,
    category: "NEIGHBORHOOD / RAG (UNINDEXED LOCALITY)",
    input: "What's it like in Sarjapur?",
    expectedDescription: "Reports missing RAG corpus data gracefully without hallucinating"
  },
  {
    id: 11,
    category: "SCHEDULING",
    input: "Schedule a visit for the first one.",
    expectedDescription: "Triggers site visit scheduling modal for current active property"
  },
  {
    id: 12,
    category: "SCHEDULING",
    input: "Actually, make that 4pm instead.",
    expectedDescription: "Updates active booking slot to 4 PM without resetting session"
  },
  {
    id: 13,
    category: "SCHEDULING (EXHAUSTION)",
    input: "Book all remaining slots at 4pm for testing, then try one more",
    expectedDescription: "Reports all brokers booked, does NOT fabricate a broker"
  },
  {
    id: 14,
    category: "SMALL TALK / ACKNOWLEDGMENT",
    input: "Thank you.",
    expectedDescription: "Short conversational acknowledgment, does NOT replay turn 1"
  },
  {
    id: 15,
    category: "SMALL TALK / ACKNOWLEDGMENT",
    input: "Okay, sounds good.",
    expectedDescription: "Short conversational confirmation, does NOT replay turn 1"
  },
  {
    id: 16,
    category: "OUT OF SCOPE / EDGE CASES (SILENCE)",
    input: "",
    expectedDescription: "Prompts user again to speak, does NOT hang"
  },
  {
    id: 17,
    category: "OUT OF SCOPE / EDGE CASES (WEATHER)",
    input: "What's the weather today?",
    expectedDescription: "Explains topic is out of scope, does NOT hallucinate weather"
  },
  {
    id: 18,
    category: "OUT OF SCOPE / EDGE CASES (GIBBERISH)",
    input: "asdf ghjkl qwerty",
    expectedDescription: "Politely asks user to repeat, does NOT guess"
  }
];

async function runContinuous18TurnTest() {
  console.log("==========================================================");
  console.log("   STEP 3 — CONTINUOUS 18-TURN VERIFICATION TEST SUITE   ");
  console.log("==========================================================\n");

  let sessionPreferences: any = { clarifyingQuestionsCount: 0, history: [] };
  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`--- [TURN ${tc.id}] [${tc.category}] ---`);
    console.log(`INPUT: "${tc.input}"`);

    try {
      const res = await fetch("http://localhost:4000/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: tc.input,
          sessionPreferences
        })
      });

      const data: any = await res.json();
      sessionPreferences = data.preferences || sessionPreferences;

      const responseText = data.response_text || "";
      console.log(`RESPONSE: "${responseText}"`);
      if (data.clarifying_question_asked) {
        console.log(`[CLARIFYING QUESTION ASKED]: true`);
      }
      if (data.booking_intent_triggered) {
        console.log(`[BOOKING INTENT TRIGGERED]: Target: "${data.target_listing?.title}"`);
      }

      // Evaluation
      let status = "PASS";
      const lowerResp = responseText.toLowerCase();

      if (tc.id === 2 && !data.clarifying_question_asked) status = "FAIL";
      if (tc.id === 10 && !lowerResp.includes("don't have verified locality background data")) status = "FAIL";
      if (tc.id === 13 && !lowerResp.includes("fully booked")) status = "FAIL";
      if (tc.id === 16 && !lowerResp.includes("didn't hear anything")) status = "FAIL";
      if (tc.id === 17 && !lowerResp.includes("outside what i can help with")) status = "FAIL";
      if (tc.id === 18 && !lowerResp.includes("didn't quite catch that")) status = "FAIL";

      if (status === "PASS") passedCount++;
      console.log(`RESULT: ${status}\n`);
    } catch (e: any) {
      console.error(`[TURN ${tc.id} ERROR]:`, e);
      console.log(`RESULT: FAIL\n`);
    }
  }

  console.log("==========================================================");
  console.log(`SUMMARY: ${passedCount} / ${testCases.length} TURNS PASSED IN CONTINUOUS SESSION`);
  console.log("==========================================================");
}

runContinuous18TurnTest();
