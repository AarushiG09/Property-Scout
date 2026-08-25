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
import { sendSiteVisitConfirmationEmail, sendOwnerListingConfirmationEmail } from "./emailService";
import { triggerN8nShortlistWorkflow } from "./n8nWorkflow";
import { book_visit, find_available_broker, find_open_time_slots } from "./brokerService";

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

    // Dispatch Confirmation Email to Owner's Email Address
    let ownerEmailResult = null;
    if (body.contactEmail) {
      console.log(`[OWNER EMAIL NOTIFICATION] Dispatching confirmation email to owner: ${body.contactEmail}`);
      ownerEmailResult = await sendOwnerListingConfirmationEmail({
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
      });
    }

    res.json({ success: true, listing: newListing, emailResult: ownerEmailResult });
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

    // Dispatch site visit confirmation email with assigned broker info
    const emailRes = await sendSiteVisitConfirmationEmail({
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
    });

    res.json({
      success: true,
      reason: "ok",
      bookingId: bookingResult.bookingId,
      broker: bookingResult.broker,
      buyerDetails: { buyerName, buyerEmail, buyerPhone },
      emailSent: emailRes.success,
      emailPreviewUrl: emailRes.previewUrl,
      googleCalendarUrl: emailRes.googleCalendarUrl,
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

async function generateEdgeTtsAudio(text: string, voice = "en-IN-NeerjaNeural"): Promise<string | null> {
  return new Promise((resolve) => {
    const id = Date.now() + "_" + Math.random().toString(36).substring(7);
    const tmpTxtFile = path.join("/tmp", `tts_input_${id}.txt`);
    const tmpAudioFile = path.join("/tmp", `tts_out_${id}.mp3`);

    // Normalize curly quotes to straight apostrophes and preserve all contractions!
    const normalizedText = text
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[\r\n]+/g, " ")
      .trim();

    console.log(`[TTS RAW INPUT] Preserved contractions input: "${normalizedText.slice(0, 70)}..."`);

    try {
      fs.writeFileSync(tmpTxtFile, normalizedText, "utf8");
    } catch (e) {
      console.warn("[EDGE-TTS ERROR] Failed to write temp text file:", e);
      resolve(null);
      return;
    }

    const cmd = `python3 -m edge_tts --file "${tmpTxtFile}" --voice "${voice}" --write-media "${tmpAudioFile}"`;
    const startTime = Date.now();

    exec(cmd, { timeout: 12000 }, (error) => {
      const duration = Date.now() - startTime;
      if (fs.existsSync(tmpTxtFile)) {
        try { fs.unlinkSync(tmpTxtFile); } catch (e) {}
      }

      if (error || !fs.existsSync(tmpAudioFile)) {
        console.warn(`[EDGE-TTS ERROR] Synthesis failed after ${duration}ms:`, error);
        resolve(null);
        return;
      }
      try {
        const audioBuffer = fs.readFileSync(tmpAudioFile);
        const base64 = audioBuffer.toString("base64");
        fs.unlinkSync(tmpAudioFile);
        console.log(`[EDGE-TTS SUCCESS] Generated ${audioBuffer.length} bytes in ${duration}ms using voice ${voice}`);
        resolve(base64);
      } catch (e) {
        console.warn("[EDGE-TTS ERROR] File read error:", e);
        resolve(null);
      }
    });
  });
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

app.listen(config.port, () => {
  console.log("====================================================");
  console.log(`  PROPERTY SCOUT BACKEND SERVER LISTENING ON PORT ${config.port}`);
  console.log(`  Health Check: http://localhost:${config.port}/api/health`);
  console.log("====================================================");
});

export default app;
