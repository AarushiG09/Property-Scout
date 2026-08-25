import React, { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Search, Send, Sparkles, MapPin, Calendar, CheckCircle2, Navigation, BookOpen, ExternalLink, Filter, Layers, X, Clock, Volume2, VolumeX, AlertTriangle, User, Mail, Phone } from "lucide-react";
import { useAudio } from "../hooks/useAudio";
import type { Listing, SourceCatalogItem, RagSearchResult, UserPreferences, AgentQueryResult } from "../types";

// Curated high-resolution property image thumbnails for Bengaluru listings
const PROPERTY_IMAGES: Record<string, string> = {
  Koramangala: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
  Indiranagar: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
  "HSR Layout": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80",
  Bellandur: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80",
  Whitefield: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80",
  Hebbal: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=600&q=80",
  "BTM Layout": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80",
  Rajajinagar: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=600&q=80",
  Jayanagar: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=600&q=80",
  Default: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80"
};

export const BuyTab: React.FC = () => {
  // Voice & Input State
  const [transcriptInput, setTranscriptInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);

  // Response & Shortlist State
  const [agentResponse, setAgentResponse] = useState<string>("Hello! I am your AI Property Scout. Click the microphone or type your rental preferences (e.g. 'Find a 2BHK in Koramangala under 40k') to explore listings.");
  const [shortlist, setShortlist] = useState<Listing[]>([]);
  const [sources, setSources] = useState<SourceCatalogItem[]>([]);
  const [ragContext, setRagContext] = useState<RagSearchResult[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ clarifyingQuestionsCount: 0 });

  // Drawers & Modals
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showSourcesDrawer, setShowSourcesDrawer] = useState(false);
  const [bookingModalListing, setBookingModalListing] = useState<Listing | null>(null);
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string | null>(null);
  const [bookingEmailPreviewUrl, setBookingEmailPreviewUrl] = useState<string | null>(null);
  const [bookingBroker, setBookingBroker] = useState<any | null>(null);
  const [bookingUnavailableSlots, setBookingUnavailableSlots] = useState<string[]>([]);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState<string | null>(null);

  const [previewBroker, setPreviewBroker] = useState<any | null>(null);

  // Booking Form State
  const [bookingDate, setBookingDate] = useState("2026-08-25");
  const [bookingSlot, setBookingSlot] = useState("10:30 AM");
  const [buyerName, setBuyerName] = useState("Aarushi Grover");
  const [buyerEmail, setBuyerEmail] = useState("aarushi@example.com");
  const [buyerPhone, setBuyerPhone] = useState("9876543210");
  const [addToCalendar, setAddToCalendar] = useState<boolean>(true);

  // Phase 5 n8n Workflow Export State
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfExportSuccessMsg, setPdfExportSuccessMsg] = useState<string | null>(null);

  const handleExportShortlistPdf = async () => {
    setExportingPdf(true);
    setPdfExportSuccessMsg(null);
    try {
      const emailTarget = buyerEmail || "aarushigrover18@gmail.com";
      let res: Response;
      try {
        res = await fetch("/api/export-shortlist-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerEmail: emailTarget,
            buyerName,
            area: filterArea || preferences.area || "Bengaluru",
            maxRent: filterRent || preferences.maxRent || 50000,
            shortlist: filteredShortlist
          })
        });
      } catch (e) {
        res = await fetch("http://localhost:4000/api/export-shortlist-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerEmail: emailTarget,
            buyerName,
            area: filterArea || preferences.area || "Bengaluru",
            maxRent: filterRent || preferences.maxRent || 50000,
            shortlist: filteredShortlist
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        setPdfExportSuccessMsg(
          data.source === "n8n_webhook"
            ? `Shortlist PDF compiled & dispatched via n8n Workflow to ${emailTarget}!`
            : `Shortlist PDF report sent to ${emailTarget}!`
        );
      } else {
        alert("Failed to send shortlist PDF: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("Error sending shortlist PDF: " + e.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // Fetch live assigned broker preview dynamically based on availability
  const fetchPreviewBroker = useCallback(async () => {
    try {
      const res = await fetchWithFallback(`/broker-preview?date=${bookingDate}&slot=${encodeURIComponent(bookingSlot)}`, { method: "GET" });
      const data = await res.json();
      if (data.success && data.broker) {
        setPreviewBroker(data.broker);
        setBookingErrorMsg(null);
      } else {
        setPreviewBroker(null);
        if (data.reason === "no_broker_available") {
          setBookingErrorMsg(`All 10 brokers are fully booked for ${bookingSlot} on ${bookingDate}.`);
          setBookingUnavailableSlots(data.availableSlots || []);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch broker preview:", e);
    }
  }, [bookingDate, bookingSlot]);

  useEffect(() => {
    fetchPreviewBroker();
  }, [fetchPreviewBroker]);

  // Filters State
  const [filterRent, setFilterRent] = useState<number | "">("");
  const [filterBhk, setFilterBhk] = useState<number | "">("");
  const [filterArea, setFilterArea] = useState<string>("");

  // Web Audio Speech Recognition & Synthesis Hook
  const {
    isListening,
    transcript,
    resetTranscript,
    audioVolume,
    isSpeaking,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    micError,
    activeSpeaker
  } = useAudio();

  const hasPlayedGreetingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const turnCountRef = useRef(0);
  const lastSubmittedQueryRef = useRef("");

  // Trigger Opening Greeting through Neural TTS pipeline on session start
  const triggerOpeningGreeting = useCallback(() => {
    if (hasPlayedGreetingRef.current) return;
    hasPlayedGreetingRef.current = true;

    const greetingText = "Hi, I'm your Scout Assistant. I can help you look for a property to buy — just tell me what kind of property you're looking for, which area, the size you need, and your budget, and I'll get started.";
    console.log("[SESSION START] Triggering opening greeting through high-quality TTS pipeline...");

    speakText(greetingText, () => {
      console.log("[GREETING COMPLETE] Opening microphone for user response...");
      startListening();
    });
  }, [speakText, startListening]);

  const startVoiceAssistantSession = () => {
    hasPlayedGreetingRef.current = false;
    triggerOpeningGreeting();
  };

  // Sync transcript input & AUTO-SUBMIT query after 2000ms (2 seconds) end-of-speech silence
  useEffect(() => {
    const trimmed = transcript.trim();
    if (isListening && trimmed.length > 5 && trimmed !== lastSubmittedQueryRef.current) {
      setTranscriptInput(trimmed);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        const nextTurn = turnCountRef.current + 1;
        console.log(`[TURN ${nextTurn} SILENCE AUTO-SUBMIT] 2s silence detected. Auto-submitting full query: "${trimmed}"`);
        handleQuerySubmit(trimmed);
      }, 2000);
    }
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [transcript, isListening]);

  // Fetch initial listings & sources on mount
  useEffect(() => {
    fetchListings();
    fetchSources();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetchWithFallback("/listings", { method: "GET" });
      const data = await res.json();
      if (data.success && data.listings) {
        setShortlist(data.listings);
      }
    } catch (e) {
      console.error("Failed to load initial listings:", e);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetchWithFallback("/sources", { method: "GET" });
      const data = await res.json();
      if (data.success && data.sources) {
        setSources(data.sources);
      }
    } catch (e) {
      console.error("Failed to load sources catalog:", e);
    }
  };

  const fetchWithFallback = async (endpoint: string, options: RequestInit) => {
    try {
      const res = await fetch(`/api${endpoint}`, options);
      if (res.ok) return res;
    } catch (e) {
      // Ignore relative error and try direct backend port
    }
    return await fetch(`http://localhost:4000/api${endpoint}`, options);
  };

  const handleOpenSnapshot = async (item: Listing) => {
    setSelectedListing(item);
    try {
      const res = await fetchWithFallback("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: `Tell me about ${item.area}` })
      });
      const data = await res.json();
      if (data.retrieved_rag_context && data.retrieved_rag_context.length > 0) {
        setRagContext(data.retrieved_rag_context);
      }
    } catch (e) {
      console.warn("Failed to load RAG snapshot guide:", e);
    }
  };

  // Execute Voice / Text Query against /api/query
  const handleQuerySubmit = async (queryText?: string) => {
    const textToSubmit = queryText || transcriptInput;
    if (!textToSubmit.trim()) {
      console.warn("[STT WARNING] Empty transcript received. Triggering spoken fallback.");
      if (voiceAudioEnabled) {
        speakText("Sorry, I didn't catch that — could you say that again?");
      }
      return;
    }

    turnCountRef.current += 1;
    const currentTurn = turnCountRef.current;
    lastSubmittedQueryRef.current = textToSubmit.trim();

    console.log(`[TURN ${currentTurn} RAW STT] Raw transcript captured: "${textToSubmit}"`);
    console.log(`[TURN ${currentTurn} SUBMITTED TO BACKEND] Payload:`, { transcript: textToSubmit, preferences });

    // CRITICAL: Stop listening and reset STT buffer immediately so Turn N text cannot pollute Turn N+1!
    stopListening();
    stopSpeaking();
    resetTranscript();

    setLoading(true);
    const queryStartTime = Date.now();

    try {
      const res = await fetchWithFallback("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: textToSubmit,
          sessionPreferences: preferences
        })
      });
      const data: AgentQueryResult = await res.json();
      const duration = Date.now() - queryStartTime;
      console.log(`[TURN ${currentTurn} RESPONSE RECEIVED] Response in ${duration}ms: "${data.response_text?.slice(0, 60)}..."`);

      if (data.success || data.response_text) {
        setAgentResponse(data.response_text);
        if (data.shortlist) setShortlist(data.shortlist);
        if (data.sources) setSources(data.sources);
        if (data.retrieved_rag_context) setRagContext(data.retrieved_rag_context);
        if (data.preferences) setPreferences(data.preferences);
        if ((data as any).booking_intent_triggered && (data as any).target_listing) {
          console.log(`[UI BOOKING MODAL OPENED] Opening schedule visit modal for ${(data as any).target_listing.title}`);
          setBookingModalListing((data as any).target_listing);
        }

        // Reset local filter chips so UI does not hide backend shortlist
        setFilterRent("");
        setFilterBhk("");
        setFilterArea("");

        // Speak AI response while microphone is OFF
        if (voiceAudioEnabled && data.response_text) {
          speakText(data.response_text);
        }
      } else {
        const errText = "Sorry, I encountered an issue processing your query. Could you repeat that?";
        setAgentResponse(errText);
        if (voiceAudioEnabled) speakText(errText);
      }
    } catch (e: any) {
      console.error(`[TURN ${currentTurn} EXCEPTION]`, e);
      const errText = "Sorry, I had a connection issue. Could you say that again?";
      setAgentResponse(errText);
      if (voiceAudioEnabled) speakText(errText);
    } finally {
      setLoading(false);
      setTranscriptInput("");
      resetTranscript();
    }
  };

  // Execute Voice Refinement against /api/refine
  const handleRefineSubmit = async (instruction: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          sessionPreferences: preferences
        })
      });
      const data: AgentQueryResult = await res.json();

      if (data.success) {
        setAgentResponse(data.response_text);
        if (data.shortlist) setShortlist(data.shortlist);
        if (data.preferences) setPreferences(data.preferences);

        if (voiceAudioEnabled && data.response_text) {
          speakText(data.response_text);
        }
      }
    } catch (e: any) {
      console.error("Refine failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Submit Site Visit Booking with Zero-Hallucination Broker Assignment Engine
  const handleBookVisit = async () => {
    if (!bookingModalListing) return;
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      alert("Please enter your Name, Email Address, and Contact Number before scheduling a visit.");
      return;
    }

    setBookingErrorMsg(null);
    setBookingUnavailableSlots([]);

    try {
      const res = await fetchWithFallback("/book-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: bookingModalListing.external_id,
          propertyTitle: bookingModalListing.title,
          area: bookingModalListing.area,
          rent: bookingModalListing.rent,
          date: bookingDate,
          timeSlot: bookingSlot,
          buyerName,
          buyerEmail,
          buyerPhone
        })
      });
      const data = await res.json();

      if (data.success) {
        setBookingSuccessCode(data.bookingId);
        setBookingBroker(data.broker || null);
        if (data.emailPreviewUrl) {
          setBookingEmailPreviewUrl(data.emailPreviewUrl);
        }
        if (data.googleCalendarUrl) {
          setGoogleCalendarUrl(data.googleCalendarUrl);
          if (addToCalendar) {
            window.open(data.googleCalendarUrl, "_blank");
          }
        }
        // Auto-update the next available broker preview for subsequent bookings!
        fetchPreviewBroker();
      } else {
        if (data.reason === "no_broker_available") {
          setBookingErrorMsg(`All 10 brokers are fully booked for ${bookingSlot} on ${bookingDate}. Please pick another time slot.`);
          setBookingUnavailableSlots(data.availableSlots || []);
        } else {
          setBookingErrorMsg(data.message || data.error || "The site visit booking could not be confirmed right now.");
        }
      }
    } catch (e) {
      setBookingErrorMsg("The booking could not be confirmed right now due to a network connection error.");
    }
  };

  // Filter shortlist locally if rent/bhk/area filters are adjusted
  const filteredShortlist = shortlist.filter(item => {
    if (filterRent && item.rent > Number(filterRent)) return false;
    if (filterBhk && item.bedrooms !== Number(filterBhk)) return false;
    if (filterArea && !item.area.toLowerCase().includes(filterArea.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
      
      {/* Mic Permission Warning Banner if blocked */}
      {micError && (
        <div className="bg-amber-950/80 border border-amber-500/40 rounded-2xl p-4 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{micError}</span>
          </div>
          <button
            onClick={() => {
              setTranscriptInput("Find me a 2BHK in Koramangala under 40k");
              handleQuerySubmit("Find me a 2BHK in Koramangala under 40k");
            }}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-semibold shrink-0"
          >
            Try Quick Voice Query Instead
          </button>
        </div>
      )}

      {/* Interactive Voice Assistant Activation Banner */}
      <div className="bg-gradient-to-r from-teal-950/80 via-slate-900 to-teal-950/80 border border-teal-500/30 rounded-3xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0 shadow-lg shadow-teal-950/40">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
              Property Scout Voice Assistant
              <span className="bg-teal-500/20 text-teal-300 text-[10px] px-2.5 py-0.5 rounded-full border border-teal-500/30 font-bold tracking-wide">
                {activeSpeaker}
              </span>
            </h3>
            <p className="text-xs text-gray-300 mt-0.5">
              Click to start the voice agent, listen to the greeting, and speak your search criteria.
            </p>
          </div>
        </div>
        <button
          onClick={() => startVoiceAssistantSession()}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-xs font-extrabold px-6 py-3 rounded-2xl shadow-xl shadow-teal-950/60 transition-all flex items-center justify-center gap-2 shrink-0 hover:scale-105"
        >
          <Mic className="w-4 h-4" /> Start Voice Assistant 🎙️
        </button>
      </div>

      {/* 1. Voice Control & Agent Assistant Bar */}
      <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-5 md:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col gap-5 relative z-10">
          
          {/* Agent Voice Response Banner */}
          <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-4 md:p-5 flex items-start gap-4 shadow-inner">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-400 tracking-wide uppercase">
                    Property Scout AI Voice Assistant
                  </span>
                  <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    Voice: {activeSpeaker}
                  </span>
                  {isSpeaking && (
                    <span className="bg-teal-500/20 text-teal-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-mono animate-pulse">
                      <Volume2 className="w-3 h-3" /> Speaking...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isSpeaking) stopSpeaking();
                      setVoiceAudioEnabled(!voiceAudioEnabled);
                    }}
                    title={voiceAudioEnabled ? "Mute Speech Output" : "Enable Speech Output"}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    {voiceAudioEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
                  </button>

                  {sources.length > 0 && (
                    <button
                      onClick={() => setShowSourcesDrawer(true)}
                      className="text-[11px] font-medium text-teal-300 hover:text-white bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      {sources.length} Sources & Citations
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm md:text-base font-medium text-gray-100 leading-relaxed">
                {agentResponse}
              </p>
            </div>
          </div>

          {/* Voice Equalizer Waveform & Input Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Microphone Button with Web Audio Equalizer Meter */}
            <button
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  if (!hasPlayedGreetingRef.current) {
                    startVoiceAssistantSession();
                  } else {
                    startListening();
                  }
                }
              }}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-3 shadow-xl ${
                isListening
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60 animate-pulse scale-105"
                  : "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950/60 hover:scale-102"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Listening... Click to Finish</span>
                  {/* Equalizer Visualizer Bars */}
                  <div className="flex items-center gap-0.5 h-4 ml-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full transition-all duration-75"
                        style={{ height: `${Math.max(4, (audioVolume * (i * 0.4)) % 16)}px` }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Speak Voice Query</span>
                </>
              )}
            </button>

            {/* Transcript Input Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleQuerySubmit(); }}
              className="flex-1 w-full flex items-center gap-2 bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-teal-500 transition-colors shadow-inner"
            >
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Or type a request (e.g., 'Find 2BHK in Koramangala under 40k near RMZ Ecospace')..."}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !transcriptInput.trim()}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick Voice Prompt Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium mr-1">Quick Voice Shortcuts:</span>
            <button
              onClick={() => { setTranscriptInput("Find 2BHK apartment in Koramangala under 40k"); handleQuerySubmit("Find 2BHK apartment in Koramangala under 40k"); }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-xl transition-colors"
            >
              "2BHK Koramangala under 40k"
            </button>
            <button
              onClick={() => { setTranscriptInput("What is Koramangala like?"); handleQuerySubmit("What is Koramangala like?"); }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-xl transition-colors"
            >
              "What is Koramangala like?" (RAG)
            </button>
            <button
              onClick={() => { setTranscriptInput("Is Indiranagar safe at night?"); handleQuerySubmit("Is Indiranagar safe at night?"); }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-xl transition-colors"
            >
              "Is Indiranagar safe at night?" (Safety)
            </button>
            <button
              onClick={() => handleRefineSubmit("Drop anything above 35k")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-xl transition-colors"
            >
              "Drop anything above 35k" (Refine)
            </button>
          </div>

        </div>
      </div>
      
      {/* 2. Interactive Filter Chips & Search Bar */}
      <div className="bg-[#131B2E]/90 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-white">Shortlist Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Max Rent Filter */}
          <select
            value={filterRent}
            onChange={(e) => setFilterRent(e.target.value ? Number(e.target.value) : "")}
            className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-gray-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">Max Rent: Any</option>
            <option value="30000">Under ₹30,000</option>
            <option value="40000">Under ₹40,000</option>
            <option value="50000">Under ₹50,000</option>
            <option value="60000">Under ₹60,000</option>
          </select>

          {/* BHK Filter */}
          <select
            value={filterBhk}
            onChange={(e) => setFilterBhk(e.target.value ? Number(e.target.value) : "")}
            className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-gray-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">BHK: Any</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
          </select>

          {/* Locality Filter */}
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-gray-200 focus:outline-none focus:border-teal-500"
          >
            <option value="">Locality: All Bengaluru</option>
            <option value="Koramangala">Koramangala</option>
            <option value="Indiranagar">Indiranagar</option>
            <option value="HSR Layout">HSR Layout</option>
            <option value="Bellandur">Bellandur</option>
            <option value="Whitefield">Whitefield</option>
            <option value="Hebbal">Hebbal</option>
            <option value="BTM Layout">BTM Layout</option>
          </select>

          {(filterRent !== "" || filterBhk !== "" || filterArea !== "") && (
            <button
              onClick={() => { setFilterRent(""); setFilterBhk(""); setFilterArea(""); }}
              className="text-teal-400 hover:text-teal-300 underline font-medium text-xs ml-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* PDF Export Success Notification Toast */}
      {pdfExportSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold p-3.5 rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {pdfExportSuccessMsg}
          </span>
          <button onClick={() => setPdfExportSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Shortlist Property Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            Shortlisted Rental Properties ({filteredShortlist.length})
          </h2>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportShortlistPdf}
              disabled={exportingPdf || filteredShortlist.length === 0}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-teal-950/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {exportingPdf ? "Compiling PDF..." : "Email Shortlist PDF 📄"}
            </button>
            <span className="text-xs text-gray-400">Showing active available pins</span>
          </div>
        </div>

        {filteredShortlist.length === 0 ? (
          <div className="bg-[#131B2E] border border-white/10 rounded-3xl p-12 text-center text-gray-400 space-y-3">
            <MapPin className="w-10 h-10 text-gray-500 mx-auto" />
            <p className="text-sm font-medium">No properties match the selected filter criteria.</p>
            <button
              onClick={() => { setFilterRent(""); setFilterBhk(""); setFilterArea(""); fetchListings(); }}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Show All Available Properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShortlist.map((item) => {
              const thumbnail = PROPERTY_IMAGES[item.area] || PROPERTY_IMAGES.Default;

              return (
                <div
                  key={item.external_id || item.id}
                  className="bg-[#131B2E] border border-white/10 hover:border-teal-500/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-teal-950/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div>
                    {/* Property High-Res Image Thumbnail */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                      <img
                        src={thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131B2E] via-transparent to-black/30" />

                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-md">
                          <CheckCircle2 className="w-3 h-3" /> {item.availability_status}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-white/10">
                        {item.bedrooms} BHK
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between">
                        <span className="text-xl font-extrabold text-white drop-shadow-md">
                          ₹{item.rent.toLocaleString("en-IN")} <span className="text-xs font-normal text-gray-300">/ mo</span>
                        </span>
                        <span className="text-xs text-gray-300 font-mono drop-shadow">{item.sqft} sqft</span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 space-y-3">
                      <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-teal-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.area} ({item.society_name})
                      </p>

                      {/* Key Amenities */}
                      {item.amenities && item.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.amenities.slice(0, 3).map((amenity, idx) => (
                            <span key={idx} className="bg-slate-900/90 text-gray-300 border border-white/5 text-[11px] px-2.5 py-0.5 rounded-lg">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* OSM Transit Commute Summary */}
                      {item.snapshot && (
                        <div className="bg-teal-950/30 border border-teal-800/30 rounded-xl p-2.5 text-xs text-teal-300 flex items-start gap-2">
                          <Navigation className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-400" />
                          <p className="line-clamp-2">{item.snapshot.commute_summary}</p>
                        </div>
                      )}

                      {/* Dynamic Scout Agent Assigned Contact */}
                      <div className="bg-slate-900/80 border border-white/5 rounded-xl p-2.5 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-teal-300 font-semibold">
                          <User className="w-3.5 h-3.5 text-teal-400" /> Scout Agent: {previewBroker ? previewBroker.name : "Rajesh Kumar"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{previewBroker ? previewBroker.phone : "+91 98450 11001"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-5 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => setBookingModalListing(item)}
                      className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-teal-950/50"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Visit
                    </button>

                    <button
                      onClick={() => handleOpenSnapshot(item)}
                      className="bg-slate-900 hover:bg-slate-800 text-gray-300 text-xs px-3.5 py-3 rounded-xl transition-colors font-medium border border-white/10"
                    >
                      Snapshot & Guide
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Neighborhood Snapshot & RAG Details Drawer */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end p-0 md:p-4">
          <div className="bg-[#131B2E] border-l md:border border-white/10 w-full max-w-xl h-full md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{selectedListing.title}</h3>
                <p className="text-xs text-teal-400">{selectedListing.area} ({selectedListing.society_name})</p>
              </div>
              <button onClick={() => setSelectedListing(null)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-300">
              {/* Rent Details */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Rent & Configuration</p>
                  <p className="text-xl font-extrabold text-white mt-0.5">₹{selectedListing.rent.toLocaleString('en-IN')} / mo</p>
                </div>
                <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold px-3 py-1 rounded-full">
                  {selectedListing.bedrooms} BHK • {selectedListing.furnishing}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description & Notes</h4>
                <p className="text-xs text-gray-200 bg-slate-900/60 p-3.5 rounded-2xl border border-white/5 leading-relaxed">
                  {selectedListing.description}
                </p>
              </div>

              {/* OpenStreetMap Transit & POI Snapshot */}
              {selectedListing.snapshot && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-4 h-4" /> OpenStreetMap Transit & POI Snapshot
                  </h4>
                  
                  <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
                    <p className="font-semibold text-white">{selectedListing.snapshot.commute_summary}</p>
                    
                    {selectedListing.snapshot.nearest_metro && (
                      <div className="flex items-center justify-between bg-teal-950/40 border border-teal-800/40 p-3 rounded-xl text-teal-300">
                        <span>Nearest Metro: <strong>{selectedListing.snapshot.nearest_metro.name}</strong></span>
                        <span className="font-mono font-bold">{selectedListing.snapshot.nearest_metro.distance_km} km</span>
                      </div>
                    )}

                    {Array.isArray(selectedListing.snapshot.transit_points) && selectedListing.snapshot.transit_points.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-gray-400 font-medium">Nearby Transit Points:</p>
                        {selectedListing.snapshot.transit_points.map((poi: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-gray-300 bg-slate-950/50 p-2.5 rounded-xl">
                            <span>{poi.name}</span>
                            <span className="font-mono text-teal-400">{poi.distance_km} km</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grounded RAG Locality Guide */}
              {ragContext.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> RAG Locality Guide & Background
                  </h4>
                  {ragContext.map((c, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 space-y-2 text-xs">
                      <p className="font-semibold text-white">{c.locality || "Locality Profile"}</p>
                      <p className="text-gray-300 leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex justify-end">
              <button onClick={() => setSelectedListing(null)} className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-5 py-2.5 rounded-xl">
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Sources & Citations Drawer */}
      {showSourcesDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end p-0 md:p-4">
          <div className="bg-[#131B2E] border-l md:border border-white/10 w-full max-w-lg h-full md:h-[85vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Sources & Grounding Citations</h3>
              </div>
              <button onClick={() => setShowSourcesDrawer(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-300">
              <p className="text-gray-400">
                Every claim made by Property Scout is grounded in verified sources mapped from <code className="text-teal-400 font-mono">RAG/sources.jsonl</code>:
              </p>

              {sources.map((src) => (
                <div key={src.id} className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-white text-sm">{src.name}</h4>
                    {src.verified && (
                      <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 font-mono text-[11px]">{src.id} • {src.type}</p>
                  <p className="text-gray-300">{src.role}</p>
                  <p className="text-gray-400 italic text-[11px]">{src.reliability_note}</p>
                  {src.url && (
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline flex items-center gap-1 font-medium pt-1">
                      Visit Source Documentation <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80 flex justify-end">
              <button onClick={() => setShowSourcesDrawer(false)} className="bg-slate-800 text-white font-medium text-xs px-5 py-2.5 rounded-xl">
                Close References
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Schedule Site Visit Modal */}
      {bookingModalListing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" /> Schedule Site Visit
              </h3>
              <button onClick={() => { setBookingModalListing(null); setBookingSuccessCode(null); setBookingBroker(null); setBookingErrorMsg(null); setBookingUnavailableSlots([]); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccessCode ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Visit Scheduled & Email Sent!</h4>
                  <p className="text-xs text-emerald-400 mt-1 flex items-center justify-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Confirmation email dispatched to {buyerEmail}
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-white/10 space-y-2 text-xs text-left">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-400">Confirmation Code</span>
                    <span className="font-mono font-extrabold text-teal-400 tracking-wider">{bookingSuccessCode}</span>
                  </div>

                  {bookingBroker && (
                    <div className="bg-teal-950/40 border border-teal-500/30 rounded-xl p-3 my-1 space-y-1">
                      <p className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-teal-400" /> Assigned Property Scout Agent
                      </p>
                      <p className="text-sm font-bold text-white">{bookingBroker.name}</p>
                      <p className="text-xs text-gray-300">📞 Phone: {bookingBroker.phone}</p>
                      <p className="text-xs text-gray-400">✉️ Email: {bookingBroker.email}</p>
                    </div>
                  )}

                  <div className="space-y-1 pt-1">
                    <p className="text-gray-300"><strong>Buyer:</strong> {buyerName}</p>
                    <p className="text-gray-300"><strong>Contact:</strong> {buyerPhone} • {buyerEmail}</p>
                    <p className="text-gray-300"><strong>Schedule:</strong> {bookingDate} at {bookingSlot}</p>
                  </div>
                </div>

                {googleCalendarUrl && (
                  <a
                    href={googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-teal-950/50 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" /> Add Event to Google Calendar 📅
                  </a>
                )}

                {bookingEmailPreviewUrl && (
                  <a
                    href={bookingEmailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-slate-800 hover:bg-slate-700 text-teal-300 font-medium text-xs py-2.5 rounded-xl border border-teal-500/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Sent Email Preview 📩
                  </a>
                )}

                <button
                  onClick={() => { setBookingModalListing(null); setBookingSuccessCode(null); setBookingEmailPreviewUrl(null); setBookingBroker(null); setGoogleCalendarUrl(null); }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold text-xs py-3 rounded-xl transition-colors border border-white/10"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-gray-300">
                <div className="bg-slate-900 p-3.5 rounded-2xl border border-white/5">
                  <p className="font-semibold text-white">{bookingModalListing.title}</p>
                  <p className="text-teal-400 mt-0.5">{bookingModalListing.area} • ₹{bookingModalListing.rent.toLocaleString('en-IN')}/mo</p>
                </div>

                {/* Live Assigned Broker Preview Card */}
                {previewBroker && (
                  <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-400" /> Assigned Property Scout Agent
                      </span>
                      <span className="bg-teal-500/20 text-teal-300 text-[10px] px-2 py-0.5 rounded-full border border-teal-500/30 font-semibold">
                        Available Agent
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-white mt-1">{previewBroker.name}</p>
                    <div className="flex items-center justify-between text-xs text-gray-300 pt-0.5">
                      <span>📞 {previewBroker.phone}</span>
                      <span className="text-gray-400">✉️ {previewBroker.email}</span>
                    </div>
                  </div>
                )}

                {bookingErrorMsg && (
                  <div className="bg-rose-950/50 border border-rose-500/30 rounded-2xl p-3.5 text-rose-200 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{bookingErrorMsg}</span>
                    </div>

                    {bookingUnavailableSlots.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-semibold text-white mb-1.5">Genuinely open time slots for {bookingDate}:</p>
                        <div className="flex flex-wrap gap-2">
                          {bookingUnavailableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => { setBookingSlot(slot); setBookingErrorMsg(null); }}
                              className="bg-teal-900/60 hover:bg-teal-600 text-teal-200 hover:text-white border border-teal-500/40 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
                            >
                              {slot} (Select Slot)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Buyer's Full Name */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-400" /> Buyer's Full Name
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Buyer's Email Address */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Buyer's Contact Number */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-400" /> Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    required
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Preferred Date */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" /> Select Preferred Date
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Preferred Time Slot */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" /> Select Time Slot
                  </label>
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="10:30 AM">10:30 AM (Morning)</option>
                    <option value="02:00 PM">02:00 PM (Afternoon)</option>
                    <option value="05:30 PM">05:30 PM (Evening)</option>
                  </select>
                </div>

                {/* Checkbox for Automatic Google Calendar Sync */}
                <label className="flex items-center gap-3 bg-slate-900/90 border border-teal-500/30 rounded-xl p-3 cursor-pointer hover:border-teal-500/60 transition-colors my-2">
                  <input
                    type="checkbox"
                    checked={addToCalendar}
                    onChange={(e) => setAddToCalendar(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded focus:ring-teal-500 cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    Sync event to Google Calendar automatically upon confirmation
                  </span>
                </label>

                <button
                  onClick={handleBookVisit}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-950/50 mt-2 text-sm"
                >
                  Confirm Site Visit Booking
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
