import express, { Request, Response } from "express";
import cors from "cors";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { config } from "./config";
import { initDatabase, getAllAvailableListings, getListingCount, insertSingleListing } from "./database";
import { initRagDatabase, getRagChunkCount } from "./ragStore";
import { loadSourceCatalog } from "./sourcesCatalog";
import { processUserQuery, refineShortlist, UserPreferences } from "./agent";
import { sendSiteVisitConfirmationEmail, sendOwnerListingConfirmationEmail, generateGoogleCalendarUrl } from "./emailService";
import { triggerN8nShortlistWorkflow } from "./n8nWorkflow";
import { book_visit, find_available_broker, find_open_time_slots } from "./brokerService";
import { EdgeTTS } from "node-edge-tts";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));

// Initialize SQLite databases and load sources catalog
initDatabase();
initRagDatabase();
loadSourceCatalog().catch(console.error);

// Log RAG database status on startup — no auto-ingest needed since rag_vectors.db is pre-built and shipped in git
(async () => {
  try {
    const ragCount = getRagChunkCount();
    if (ragCount > 0) {
      console.log(`[RAG] Pre-built knowledge base loaded: ${ragCount} chunks indexed and ready.`);
    } else {
      console.warn("[RAG] WARNING: RAG database is empty. Run 'npx ts-node scraper/docs_ingestion.ts' locally to rebuild.");
    }
  } catch (err: any) {
    console.error("[RAG] Startup check failed:", err.message);
  }
})();

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Property Scout Voice Real Estate AI Agent",
    version: "1.0.0",
    database: {
      totalListings: getListingCount(),
      ragChunks: getRagChunkCount()
    }
  });
});

// Serve full README.md file directly via API URL
app.get("/api/readme", (req: Request, res: Response) => {
  try {
    const readmePath = path.join(__dirname, "../../README.md");
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, "utf-8");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.send(content);
    }
    return res.status(404).json({ success: false, error: "README.md file not found" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all active available listings
app.get("/api/listings", (req: Request, res: Response) => {
  try {
    const listings = getAllAvailableListings();
    res.json({ success: true, count: listings.length, listings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new seller property listing (dynamically available to buyers & AI voice agent + owner email notification)
app.post("/api/listings", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.title || !body.area || !body.rent) {
      return res.status(400).json({ success: false, error: "Title, area, and rent are required" });
    }

    const newListing = insertSingleListing({
      title: body.title,
      rent: Number(body.rent),
      bedrooms: Number(body.bedrooms) || 2,
      furnishing: body.furnishing || "Semi-Furnished",
      amenities: Array.isArray(body.amenities) ? body.amenities : ["Power Backup", "Car Parking"],
      society_name: body.society_name || body.area,
      sqft: Number(body.sqft) || 1200,
      availabilityStatus: body.availabilityStatus || "Available",
      latitude: Number(body.latitude) || 12.9716,
      longitude: Number(body.longitude) || 77.5946,
      area: body.area,
      description: body.description || `${body.title} in ${body.area}`
    });

    console.log(`[SELLER PROPERTY CREATED] "${newListing.title}" in ${newListing.area} for ₹${newListing.rent}/mo`);

    // Dispatch Confirmation Email to Owner's Email Address (Non-blocking)
    if (body.contactEmail) {
      console.log(`[OWNER EMAIL NOTIFICATION] Dispatching confirmation email to owner in background: ${body.contactEmail}`);
      sendOwnerListingConfirmationEmail({
        listingId: newListing.external_id,
        title: newListing.title,
        area: newListing.area,
        city: body.city || "Bengaluru",
        rent: newListing.rent,
        bedrooms: newListing.bedrooms,
        furnishing: newListing.furnishing,
        sqft: newListing.sqft,
        contactName: body.contactName || "Property Owner",
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone || "[REDACTED]",
        photoCount: Array.isArray(body.photos) ? body.photos.length : 2
      }).catch(err => console.error("Background email failed:", err));
    }

    res.json({ success: true, listing: newListing, emailDispatched: true });
  } catch (err: any) {
    console.error("Error creating seller listing:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phase 5: Export Shortlist PDF & Trigger n8n Workflow Endpoint
app.post("/api/export-shortlist-pdf", async (req: Request, res: Response) => {
  try {
    const { buyerEmail, buyerName, area, maxRent, shortlist } = req.body;

    if (!buyerEmail || typeof buyerEmail !== "string") {
      return res.status(400).json({ success: false, error: "Recipient buyerEmail is required" });
    }

    const items = Array.isArray(shortlist) && shortlist.length > 0 ? shortlist : getAllAvailableListings().slice(0, 3);

    const result = await triggerN8nShortlistWorkflow({
      buyerEmail: buyerEmail.trim(),
      buyerName: buyerName || "Scout Renter",
      area: area || items[0]?.area || "Bengaluru",
      maxRent: maxRent || 50000,
      shortlist: items
    });

    res.json(result);
  } catch (err: any) {
    console.error("Error triggering shortlist PDF export:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get resolved source catalog
app.get("/api/sources", async (req: Request, res: Response) => {
  try {
    const catalog = await loadSourceCatalog();
    res.json({ success: true, sources: Object.values(catalog) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Neighborhood Snapshot Endpoint - fetches rich RAG context by area/locality directly
app.post("/api/snapshot", async (req: Request, res: Response) => {
  // Hard 25-second timeout — prevents Railway from hanging on BGE model cold-start
  const timeoutHandle = setTimeout(() => {
    if (!res.headersSent) {
      console.warn("[SNAPSHOT TIMEOUT] Returning empty context after 25s timeout");
      res.json({
        success: true,
        area: req.body?.area || "",
        locality_context: [],
        property_facts: null,
        sources_cited: [],
        rag_chunks_found: 0
      });
    }
  }, 25000);

  try {
    const { area, listing } = req.body;
    if (!area || typeof area !== "string") {
      clearTimeout(timeoutHandle);
      return res.status(400).json({ success: false, error: "area is required" });
    }

    const { generateBgeEmbedding, searchRagChunks } = await import("./ragStore");

    // Wrap BGE embedding in a 8-second timeout to survive cold-start model loading
    const embeddingWithTimeout = (text: string): Promise<number[]> => {
      return Promise.race([
        generateBgeEmbedding(text),
        new Promise<number[]>((_, reject) =>
          setTimeout(() => reject(new Error("embedding_timeout")), 8000)
        )
      ]);
    };

    let queryVec: number[];
    let safetyVec: number[];

    try {
      // Search locality RAG by area name
      const localityQuery = `${area} neighborhood character history development safety`;
      queryVec = await embeddingWithTimeout(localityQuery);
    } catch (embErr) {
      console.warn("[SNAPSHOT] BGE embedding timed out for locality query, using fallback");
      // Simple deterministic fallback — still performs keyword-based area matching below
      queryVec = new Array(384).fill(0).map((_, i) => Math.sin(i * area.charCodeAt(0 % area.length)));
    }

    const ragResults = searchRagChunks(queryVec, 5);
    const areaLower = area.toLowerCase();
    const localityMatches = ragResults.filter(r =>
      (r.locality && r.locality.toLowerCase().includes(areaLower)) ||
      (r.embedding_text && r.embedding_text.toLowerCase().includes(areaLower))
    );

    try {
      const safetyQuery = `${area} safety crime night`;
      safetyVec = await embeddingWithTimeout(safetyQuery);
    } catch (embErr) {
      console.warn("[SNAPSHOT] BGE embedding timed out for safety query, using fallback");
      safetyVec = new Array(384).fill(0).map((_, i) => Math.cos(i * area.charCodeAt(0 % area.length)));
    }

    const safetyResults = searchRagChunks(safetyVec, 3);

    // Build combined context list (locality first, then safety, deduped)
    const seen = new Set<string>();
    const combinedContext: any[] = [];

    for (const r of [...localityMatches, ...safetyResults.slice(0, 2)]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        combinedContext.push({
          id: r.id,
          locality: r.locality || area,
          region: r.region || "Bengaluru",
          document_type: r.document_type,
          content: r.content,
          sources: r.sources,
          supported_topics: r.supported_topics,
          do_not_infer: r.do_not_infer,
          similarity: r.similarity
        });
      }
    }

    // Build property-specific facts from listing data
    const propertyFacts = listing ? {
      title: listing.title,
      area: listing.area,
      rent: listing.rent,
      bedrooms: listing.bedrooms,
      furnishing: listing.furnishing,
      sqft: listing.sqft,
      amenities: typeof listing.amenities === "string"
        ? JSON.parse(listing.amenities)
        : (listing.amenities || []),
      society_name: listing.society_name,
      description: listing.description
    } : null;

    clearTimeout(timeoutHandle);
    if (!res.headersSent) {
      res.json({
        success: true,
        area,
        locality_context: combinedContext,
        property_facts: propertyFacts,
        sources_cited: [...new Set(combinedContext.flatMap(c => c.sources || []))],
        rag_chunks_found: combinedContext.length
      });
    }
  } catch (err: any) {
    clearTimeout(timeoutHandle);
    console.error("Error generating snapshot:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// Conversational Agent RAG + Tool Query Endpoint
app.post("/api/query", async (req: Request, res: Response) => {
  try {
    const { transcript, sessionPreferences } = req.body;
    if (typeof transcript !== "string") {
      return res.status(400).json({ success: false, error: "Query transcript is required" });
    }

    const result = await processUserQuery(transcript, sessionPreferences);
    res.json(result);
  } catch (err: any) {
    console.error("Error processing /api/query:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

// Refine Shortlist Endpoint
app.post("/api/refine", async (req: Request, res: Response) => {
  try {
    const { feedbackText, currentShortlist, currentPreferences } = req.body;
    if (!feedbackText || typeof feedbackText !== "string") {
      return res.status(400).json({ success: false, error: "Feedback text is required" });
    }

    const result = await refineShortlist(feedbackText, currentShortlist || [], currentPreferences || {});
    res.json(result);
  } catch (err: any) {
    console.error("Error processing /api/refine:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

// Book Site Visit Endpoint with Broker Assignment Engine
app.post("/api/book-visit", async (req: Request, res: Response) => {
  try {
    const { propertyId, propertyTitle, area, rent, date, timeSlot, buyerName, buyerEmail, buyerPhone } = req.body;
    if (!propertyId || !date || !timeSlot || !buyerName || !buyerEmail || !buyerPhone) {
      return res.status(400).json({ success: false, reason: "missing_fields", error: "Property ID, date, time slot, buyer name, email, and contact number are required" });
    }

    // Invoke zero-hallucination broker assignment engine
    const bookingResult = book_visit({
      listingId: propertyId,
      propertyTitle: propertyTitle || "Selected Rental Property",
      area: area || "Bengaluru",
      rent: rent || 35000,
      visitDate: date,
      timeSlot,
      buyerName,
      buyerEmail,
      buyerPhone
    });

    if (!bookingResult.success) {
      return res.status(200).json(bookingResult);
    }

    // Dispatch site visit confirmation email with assigned broker info (Non-blocking)
    const bookingInfo = {
      bookingId: bookingResult.bookingId!,
      propertyTitle: propertyTitle || "Selected Rental Property",
      area: area || "Bengaluru",
      rent: rent || 35000,
      date,
      timeSlot,
      buyerName,
      buyerEmail,
      buyerPhone,
      broker: bookingResult.broker!
    };
    
    sendSiteVisitConfirmationEmail(bookingInfo).catch(err => console.error("Background email failed:", err));

    const googleCalendarUrl = generateGoogleCalendarUrl(bookingInfo);

    res.json({
      success: true,
      reason: "ok",
      bookingId: bookingResult.bookingId,
      broker: bookingResult.broker,
      buyerDetails: { buyerName, buyerEmail, buyerPhone },
      emailSent: true,
      googleCalendarUrl: googleCalendarUrl,
      message: `Site visit for "${propertyTitle || 'Property'}" confirmed with agent ${bookingResult.broker!.name} on ${date} at ${timeSlot}.`
    });
  } catch (err: any) {
    console.error("Error in /api/book-visit:", err);
    res.status(500).json({
      success: false,
      reason: "db_error",
      error: "The site visit booking could not be confirmed right now due to a data storage error."
    });
  }
});

// Broker Preview & Availability Check Endpoint
app.get("/api/broker-preview", (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || "2026-08-25";
    const slot = (req.query.slot as string) || "10:30 AM";
    const broker = find_available_broker(date, slot);
    const openSlots = find_open_time_slots(date, slot);
    if (broker) {
      res.json({ success: true, broker, availableSlots: openSlots });
    } else {
      res.json({ success: false, reason: "no_broker_available", availableSlots: openSlots, message: `All 10 brokers are fully booked for ${slot} on ${date}.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Native Node.js Text-to-Speech synthesizer using Microsoft Edge Neural TTS ("en-IN-NeerjaNeural").
 * Runs directly in Node.js without requiring python3 or external CLI tools.
 */
async function generateEdgeTtsAudio(text: string, voice: string = "en-IN-NeerjaNeural"): Promise<string | null> {
  const cleanText = text.replace(/[*#_`]/g, "").replace(/\[.*?\]/g, "").trim();
  if (!cleanText) return null;

  const tmpDir = path.join(__dirname, "../data");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpAudioFile = path.join(tmpDir, `tts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`);
  const startTime = Date.now();

  try {
    const tts = new EdgeTTS({ voice, timeout: 10000 });
    await tts.ttsPromise(cleanText, tmpAudioFile);

    if (fs.existsSync(tmpAudioFile)) {
      const audioBuffer = fs.readFileSync(tmpAudioFile);
      const base64 = audioBuffer.toString("base64");
      fs.unlinkSync(tmpAudioFile);
      console.log(`[EDGE-TTS NODE SUCCESS] Generated ${audioBuffer.length} bytes in ${Date.now() - startTime}ms using voice ${voice}`);
      return base64;
    }
  } catch (err: any) {
    console.warn(`[EDGE-TTS NODE ERROR] Synthesis failed after ${Date.now() - startTime}ms:`, err?.message || err);
    if (fs.existsSync(tmpAudioFile)) {
      try { fs.unlinkSync(tmpAudioFile); } catch (e) {}
    }
  }

  return null;
}

// High Quality Text-to-Speech (Sarvam AI + Edge-TTS Neural Fallback) Endpoint
app.post("/api/tts", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { text, speaker = "ritu" } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Text parameter is required for TTS" });
    }

    const cleanText = text.replace(/[*#_`]/g, "").replace(/\[.*?\]/g, "").trim();

    // 1. Primary Engine: Sarvam AI (if API key is present)
    if (config.sarvamApiKey) {
      console.log(`[TTS] Attempting Sarvam AI synthesis for ${cleanText.length} chars...`);
      try {
        const response = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": config.sarvamApiKey
          },
          body: JSON.stringify({
            inputs: [cleanText.slice(0, 500)],
            target_language_code: "en-IN",
            speaker,
            pitch: 0,
            pace: 1.05,
            loudness: 1.5,
            speech_sample_rate: 22050,
            enable_preprocessing: true,
            model: "bulbul:v1"
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audios && data.audios.length > 0) {
            console.log(`[TTS SUCCESS] Sarvam AI completed in ${Date.now() - startTime}ms`);
            return res.json({
              success: true,
              engine: "sarvam",
              speaker: "Ritu (Sarvam AI)",
              audioBase64: data.audios[0],
              format: "audio/wav"
            });
          }
        } else {
          console.warn(`[TTS WARNING] Sarvam API returned HTTP ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`[TTS ERROR] Sarvam API exception: ${err.message}`);
      }
    }

    // 2. Secondary High Quality Engine: Microsoft Neural Edge-TTS ("en-IN-NeerjaNeural")
    console.log(`[TTS] Using Neural Edge-TTS fallback (en-IN-NeerjaNeural)...`);
    const edgeAudioBase64 = await generateEdgeTtsAudio(cleanText, "en-IN-NeerjaNeural");
    if (edgeAudioBase64) {
      return res.json({
        success: true,
        engine: "edge-tts",
        speaker: "Neerja (Neural Edge TTS)",
        audioBase64: edgeAudioBase64,
        format: "audio/mp3"
      });
    }

    // 3. Fallback notice for browser speech synthesis
    console.warn(`[TTS FALLBACK] Both server TTS engines unavailable. Falling back to browser Web Speech API.`);
    res.json({
      success: false,
      fallback: true,
      speaker: "Ritu (Web Speech Profile)",
      message: "Server TTS unavailable. Using browser speech synthesis fallback."
    });
  } catch (err: any) {
    console.error("TTS endpoint error:", err);
    res.json({ success: false, fallback: true, error: err.message });
  }
});

// Diagnostic Endpoint to test live email config
app.post("/api/test-email", async (req: Request, res: Response) => {
  try {
    console.log("Triggering diagnostic test email...");
    const emailRes = await sendSiteVisitConfirmationEmail({
      bookingId: "TEST-DIAGNOSTIC",
      propertyTitle: "Diagnostic Test Property",
      area: "Bengaluru",
      rent: 10000,
      date: "2026-08-28",
      timeSlot: "10:30 AM",
      buyerName: "Test Diagnostic",
      buyerEmail: req.body.email || "aarushigrover18@gmail.com",
      buyerPhone: "9876543210",
      broker: { broker_id: 1, name: "Diagnostic Agent", phone: "123", email: "test@example.com", image_url: "none", specialization: "none", rating: 5, total_deals: 1 }
    });
    res.json({ success: true, emailRes });
  } catch (e: any) {
    res.json({ success: false, error: e.message, stack: e.stack });
  }
});

// Process Error Guards to prevent container crash on transient network glitches
process.on("unhandledRejection", (reason, promise) => {
  console.warn("[SERVER WARNING] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[SERVER ERROR] Uncaught Exception thrown:", err);
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (config.port || 4000);
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log("====================================================");
  console.log(`  PROPERTY SCOUT BACKEND SERVER LISTENING ON ${HOST}:${PORT}`);
  console.log(`  Health Check: http://${HOST}:${PORT}/api/health`);
  console.log("====================================================");
});

export default app;
