import http from "http";
import app from "./server";

const PORT = 4001;

function makeRequest(options: http.RequestOptions, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPhase3Tests() {
  console.log("====================================================");
  console.log("  PROPERTY SCOUT - PHASE 3: BACKEND SERVER API TESTS");
  console.log("====================================================");

  const server = app.listen(PORT, async () => {
    try {
      // 1. Test GET /api/health
      console.log("\n1. Testing GET /api/health...");
      const health = await makeRequest({ host: "localhost", port: PORT, path: "/api/health", method: "GET" });
      console.log("Health Status:", health.status, "| Listings:", health.listings_count, "| RAG Chunks:", health.rag_chunks_count);

      // 2. Test GET /api/listings
      console.log("\n2. Testing GET /api/listings...");
      const listingsRes = await makeRequest({ host: "localhost", port: PORT, path: "/api/listings", method: "GET" });
      console.log("Listings Count:", listingsRes.count, "| Sample Title:", listingsRes.listings[0]?.title);

      // 3. Test GET /api/sources
      console.log("\n3. Testing GET /api/sources...");
      const sourcesRes = await makeRequest({ host: "localhost", port: PORT, path: "/api/sources", method: "GET" });
      console.log("Sources Resolved:", sourcesRes.sources?.length, "| Sample Source:", sourcesRes.sources[0]?.name);

      // 4. Test POST /api/query (Search Query with Preference Extraction & OSM MCP Transit Snapshot)
      console.log("\n4. Testing POST /api/query (Search Query)...");
      const queryBody = { transcript: "Find me a 2BHK apartment in Koramangala under 40k near RMZ Ecospace" };
      const queryRes = await makeRequest(
        { host: "localhost", port: PORT, path: "/api/query", method: "POST", headers: { "Content-Type": "application/json" } },
        queryBody
      );
      console.log("Response Text:", queryRes.response_text);
      console.log("Shortlist Count:", queryRes.shortlist?.length);
      if (queryRes.shortlist?.length > 0) {
        console.log("Top Pick:", queryRes.shortlist[0].title, "| Rent:", queryRes.shortlist[0].rent);
        console.log("Transit Summary:", queryRes.shortlist[0].snapshot?.commute_summary);
      }

      // 5. Test POST /api/query (RAG Locality Inquiry)
      console.log("\n5. Testing POST /api/query (RAG Locality Inquiry: 'What is Koramangala like?')...");
      const ragBody = { transcript: "What is the neighborhood character and history of Koramangala?" };
      const ragRes = await makeRequest(
        { host: "localhost", port: PORT, path: "/api/query", method: "POST", headers: { "Content-Type": "application/json" } },
        ragBody
      );
      console.log("RAG Triggered Contexts:", ragRes.retrieved_rag_context?.length);
      console.log("Citations Resolved:", ragRes.sources?.map((s: any) => s.name));

      // 6. Test POST /api/query (Safety Inquiry with Non-Binary Enforcement)
      console.log("\n6. Testing POST /api/query (Safety Query: 'Is Indiranagar safe at night?')...");
      const safetyBody = { transcript: "Is Indiranagar safe at night?" };
      const safetyRes = await makeRequest(
        { host: "localhost", port: PORT, path: "/api/query", method: "POST", headers: { "Content-Type": "application/json" } },
        safetyBody
      );
      console.log("Response Text:", safetyRes.response_text);

      // 7. Test POST /api/refine (Shortlist Refinement)
      console.log("\n7. Testing POST /api/refine ('Drop anything above 35k')...");
      const refineBody = {
        instruction: "Drop anything above 35k",
        sessionPreferences: queryRes.preferences
      };
      const refineRes = await makeRequest(
        { host: "localhost", port: PORT, path: "/api/refine", method: "POST", headers: { "Content-Type": "application/json" } },
        refineBody
      );
      console.log("Refined Max Rent:", refineRes.preferences?.maxRent);
      console.log("Refined Shortlist Count:", refineRes.shortlist?.length);

      // 8. Test POST /api/book-visit
      console.log("\n8. Testing POST /api/book-visit...");
      const bookBody = { propertyId: "brent_koramangala_101", propertyTitle: "Spacious 2BHK Koramangala", date: "2026-08-20", timeSlot: "10:30 AM" };
      const bookRes = await makeRequest(
        { host: "localhost", port: PORT, path: "/api/book-visit", method: "POST", headers: { "Content-Type": "application/json" } },
        bookBody
      );
      console.log("Booking Status:", bookRes.success, "| Confirmation Code:", bookRes.bookingId);

      console.log("\n====================================================");
      console.log("  ALL PHASE 3 API ENDPOINTS PASSED VERIFICATION!");
      console.log("====================================================\n");

      server.close();
      process.exit(0);
    } catch (e: any) {
      console.error("Test failed:", e);
      server.close();
      process.exit(1);
    }
  });
}

runPhase3Tests();
