import { initDatabase, getDatabase, FIXED_BROKERS } from "../src/database";
import { book_visit, find_available_broker, find_open_time_slots } from "../src/brokerService";

// Ensure database tables and brokers are initialized
initDatabase();

async function runBrokerTestSuite() {
  console.log("\n=======================================================");
  console.log("  RUNNING BROKER ASSIGNMENT & CONCURRENCY TEST SUITE   ");
  console.log("=======================================================\n");

  const testDate = "2026-09-15";
  const testSlot = "10:30 AM";
  const db = getDatabase();

  // Clean up any existing test bookings for test date
  db.prepare("DELETE FROM site_visit_bookings WHERE visit_date = ?").run(testDate);

  console.log(`[TEST 1] Testing 10 Brokers Assignment & 11th Booking Rejection for slot ${testSlot}...`);

  const bookedIds: string[] = [];

  // Book 10 brokers sequentially
  for (let i = 1; i <= 10; i++) {
    const res = book_visit({
      listingId: `test_listing_${i}`,
      propertyTitle: `Test Property ${i}`,
      area: "Indiranagar",
      rent: 40000,
      visitDate: testDate,
      timeSlot: testSlot,
      buyerName: `Test Buyer ${i}`,
      buyerEmail: `buyer${i}@example.com`,
      buyerPhone: `987654320${i}`
    });

    if (!res.success || !res.broker) {
      console.error(`❌ FAILED: Booking #${i} failed unexpectedly:`, res);
      process.exit(1);
    }

    bookedIds.push(res.bookingId!);
    console.log(`  ✓ Booking #${i} assigned to Broker #${res.broker.broker_id}: ${res.broker.name}`);
  }

  // Verify DB count is exactly 10
  const countRow = db.prepare("SELECT COUNT(*) as count FROM site_visit_bookings WHERE visit_date = ? AND time_slot = ?").get(testDate, testSlot) as { count: number };
  console.log(`  ✓ Total bookings in DB for ${testSlot}: ${countRow.count} (Expected: 10)`);
  if (countRow.count !== 10) {
    console.error(`❌ FAILED: Expected 10 bookings, found ${countRow.count}`);
    process.exit(1);
  }

  // Attempt 11th booking for the SAME fully-booked slot
  console.log(`\n  Attempting 11th booking for fully-booked slot ${testSlot}...`);
  const eleventhResult = book_visit({
    listingId: "test_listing_11",
    propertyTitle: "Test Property 11",
    area: "Koramangala",
    rent: 35000,
    visitDate: testDate,
    timeSlot: testSlot,
    buyerName: "Eleventh Buyer",
    buyerEmail: "eleventh@example.com",
    buyerPhone: "9876543211"
  });

  console.log(`  ✓ 11th Booking Result: success=${eleventhResult.success}, reason=${eleventhResult.reason}`);
  console.log(`  ✓ Message: "${eleventhResult.message}"`);
  console.log(`  ✓ Offered Alternative Open Slots: [${eleventhResult.availableSlots?.join(", ")}]`);

  if (eleventhResult.success) {
    console.error("❌ FAILED: 11th booking succeeded when all 10 brokers were booked!");
    process.exit(1);
  }

  if (eleventhResult.reason !== "no_broker_available") {
    console.error(`❌ FAILED: Expected reason "no_broker_available", got "${eleventhResult.reason}"`);
    process.exit(1);
  }

  // Assert DB count remains exactly 10
  const post11CountRow = db.prepare("SELECT COUNT(*) as count FROM site_visit_bookings WHERE visit_date = ? AND time_slot = ?").get(testDate, testSlot) as { count: number };
  if (post11CountRow.count !== 10) {
    console.error(`❌ FAILED: 11th booking modified DB count to ${post11CountRow.count}`);
    process.exit(1);
  }
  console.log("  ✅ TEST 1 PASSED: 11th booking correctly rejected with structured 'no_broker_available'!");

  // TEST 2: Concurrent Race Condition Test
  console.log(`\n-------------------------------------------------------`);
  console.log(`[TEST 2] Testing Concurrent Race-Condition Guard for slot 02:00 PM...`);

  const raceSlot = "02:00 PM";

  // Pre-fill 9 brokers for 02:00 PM slot, leaving EXACTLY 1 broker free (Broker #10)
  for (let i = 1; i <= 9; i++) {
    book_visit({
      listingId: `race_listing_${i}`,
      propertyTitle: `Race Property ${i}`,
      area: "HSR Layout",
      rent: 45000,
      visitDate: testDate,
      timeSlot: raceSlot,
      buyerName: `Race Buyer ${i}`,
      buyerEmail: `racebuyer${i}@example.com`,
      buyerPhone: `980004320${i}`
    });
  }

  console.log(`  Pre-filled 9 brokers for ${raceSlot}. Exactly 1 broker remains available.`);

  // Fire 2 simultaneous concurrent requests for the final remaining slot
  console.log("  Firing 2 simultaneous booking requests for the last remaining slot...");
  const req1 = Promise.resolve().then(() => book_visit({
    listingId: "concurrent_A",
    propertyTitle: "Concurrent Property A",
    area: "Whitefield",
    rent: 50000,
    visitDate: testDate,
    timeSlot: raceSlot,
    buyerName: "Concurrent Buyer A",
    buyerEmail: "buyerA@example.com",
    buyerPhone: "9999900001"
  }));

  const req2 = Promise.resolve().then(() => book_visit({
    listingId: "concurrent_B",
    propertyTitle: "Concurrent Property B",
    area: "Indiranagar",
    rent: 52000,
    visitDate: testDate,
    timeSlot: raceSlot,
    buyerName: "Concurrent Buyer B",
    buyerEmail: "buyerB@example.com",
    buyerPhone: "9999900002"
  }));

  const [resA, resB] = await Promise.all([req1, req2]);

  console.log(`  ✓ Concurrent Request A Result: success=${resA.success}, reason=${resA.reason}`);
  console.log(`  ✓ Concurrent Request B Result: success=${resB.success}, reason=${resB.reason}`);

  const successCount = (resA.success ? 1 : 0) + (resB.success ? 1 : 0);
  console.log(`  ✓ Successful Concurrent Bookings: ${successCount} (Expected: Exactly 1)`);

  if (successCount !== 1) {
    console.error(`❌ FAILED: Expected exactly 1 successful booking under race condition, but got ${successCount}! Double booking occurred!`);
    process.exit(1);
  }

  // Verify total count in DB is exactly 10
  const finalRaceCountRow = db.prepare("SELECT COUNT(*) as count FROM site_visit_bookings WHERE visit_date = ? AND time_slot = ?").get(testDate, raceSlot) as { count: number };
  console.log(`  ✓ DB Count for ${raceSlot}: ${finalRaceCountRow.count} (Expected: 10)`);

  if (finalRaceCountRow.count !== 10) {
    console.error(`❌ FAILED: DB count expected 10, found ${finalRaceCountRow.count}`);
    process.exit(1);
  }

  console.log("  ✅ TEST 2 PASSED: Concurrency & Database UNIQUE constraint prevented double-booking under race conditions!");

  console.log("\n=======================================================");
  console.log("  🎉 ALL BROKER ASSIGNMENT TESTS PASSED SUCCESSFULLY!  ");
  console.log("=======================================================\n");
}

runBrokerTestSuite().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
