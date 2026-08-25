import React, { useState } from "react";
import { Info, Mail, ShieldCheck, FileText, HelpCircle, X } from "lucide-react";

export type ModalType = "about" | "contact" | "terms" | "privacy" | "faqs" | null;

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <>
      <footer className="w-full bg-[#0B0F1A]/95 border-t border-white/10 py-6 px-4 md:px-8 mt-auto z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Brand info */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <span className="material-symbols-outlined text-[18px]">domain</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                Property Scout <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-mono">v1.0 AI</span>
              </p>
              <p className="text-xs text-gray-400">Voice-First AI Real Estate Scout for Bengaluru</p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-gray-300">
            <button
              onClick={() => setActiveModal("about")}
              className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5 text-teal-500" />
              About Us
            </button>

            <button
              onClick={() => setActiveModal("contact")}
              className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-teal-500" />
              Contact Us
            </button>

            <button
              onClick={() => setActiveModal("terms")}
              className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-teal-500" />
              Terms & Conditions
            </button>

            <button
              onClick={() => setActiveModal("privacy")}
              className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              Privacy Policy
            </button>

            <button
              onClick={() => setActiveModal("faqs")}
              className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-teal-500" />
              FAQs
            </button>
          </div>

          {/* Right Copyright */}
          <div className="text-xs text-gray-500 text-center md:text-right">
            © {new Date().getFullYear()} Property Scout. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modal Overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  {activeModal === "about" && <Info className="w-4 h-4" />}
                  {activeModal === "contact" && <Mail className="w-4 h-4" />}
                  {activeModal === "terms" && <FileText className="w-4 h-4" />}
                  {activeModal === "privacy" && <ShieldCheck className="w-4 h-4" />}
                  {activeModal === "faqs" && <HelpCircle className="w-4 h-4" />}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {activeModal === "about" && "About Property Scout"}
                  {activeModal === "contact" && "Contact & Support"}
                  {activeModal === "terms" && "Terms & Conditions"}
                  {activeModal === "privacy" && "Privacy Policy & PII Protection"}
                  {activeModal === "faqs" && "Frequently Asked Questions"}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm text-gray-300 leading-relaxed">
              {activeModal === "about" && (
                <>
                  <p>
                    <strong>Property Scout</strong> is a voice-first AI property assistant designed for buyers, renters, and listing agents in Bengaluru.
                  </p>
                  <p>
                    By combining natural spoken voice interaction with grounded Retrieval-Augmented Generation (RAG) and live geospatial OpenStreetMap MCP transit calculations, Property Scout helps users discover, refine, and inspect properties with zero guesswork.
                  </p>
                  <div className="bg-teal-950/40 border border-teal-800/40 rounded-xl p-4 space-y-2 text-xs">
                    <p className="font-semibold text-teal-300">Core System Innovations:</p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-300">
                      <li>Voice Preference Extraction & Conversational Shortlisting (Gemini 3.6 Flash).</li>
                      <li>Semantic Locality RAG Knowledge Retrieval using <code className="text-teal-400 font-mono">BAAI/bge-small-en-v1.5</code> embeddings.</li>
                      <li>Geospatial Metro & POI distance math via OpenStreetMap MCP.</li>
                      <li>Strict non-binary crime dataset evidence without arbitrary ratings.</li>
                      <li>Automatic PII sanitization for seller listing privacy.</li>
                    </ul>
                  </div>
                </>
              )}

              {activeModal === "contact" && (
                <>
                  <p>
                    Have questions, feedback, or need technical assistance with Property Scout? Reach out to our dedicated support team.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                    <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl">
                      <p className="text-xs text-gray-400 font-medium">Customer Support Email</p>
                      <p className="text-sm font-semibold text-teal-400 mt-1">support@propertyscout.ai</p>
                    </div>
                    <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl">
                      <p className="text-xs text-gray-400 font-medium">Headquarters</p>
                      <p className="text-sm font-semibold text-white mt-1">Indiranagar 100 Feet Rd, Bengaluru</p>
                    </div>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your message has been sent to our team."); closeModal(); }} className="space-y-3 pt-2">
                    <input type="email" placeholder="Your Email Address" required className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500" />
                    <textarea placeholder="How can we help you?" rows={3} required className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500" />
                    <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
                      Submit Support Inquiry
                    </button>
                  </form>
                </>
              )}

              {activeModal === "terms" && (
                <>
                  <p className="font-semibold text-white">1. Platform Usage & Guidelines</p>
                  <p>
                    Property Scout provides rental listings, neighborhood context, and transit metrics for informational and transaction enablement purposes in Bengaluru.
                  </p>
                  <p className="font-semibold text-white mt-4">2. Listing Accuracy & Verification</p>
                  <p>
                    Listing data is sanitized and active pins are stored in local listings storage. Users are encouraged to inspect properties in person before making financial commitments.
                  </p>
                  <p className="font-semibold text-white mt-4">3. Data Source Attribution</p>
                  <p>
                    Transit math and POIs are retrieved via OpenStreetMap APIs. Locality background statistics are attributed to public knowledge records in compliance with citation requirements.
                  </p>
                </>
              )}

              {activeModal === "privacy" && (
                <>
                  <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 text-xs text-emerald-300 mb-2">
                    <strong>Zero PII Exposure Guarantee:</strong> Property Scout automatically scrubs phone numbers, email addresses, and agent names from listing descriptions before public indexing.
                  </div>
                  <p>
                    <strong>Data Collection:</strong> We collect spoken audio transcripts purely to extract search criteria (e.g. budget, BHK, locality preference). Transcripts are not sold to third parties.
                  </p>
                  <p>
                    <strong>Cookie Policy:</strong> We use essential session cookies to remember your active Buy/Sell mode preferences and active shortlist filters.
                  </p>
                  <p>
                    <strong>PII Sanitization:</strong> Any phone number matching Indian formats (+91, 10-digit numbers) or email addresses posted by users in listing forms are redacted into <code className="text-amber-400 font-mono">[REDACTED_PHONE]</code> and <code className="text-amber-400 font-mono">[REDACTED_EMAIL]</code>.
                  </p>
                </>
              )}

              {activeModal === "faqs" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-teal-300 text-sm">Q: How does the AI voice search work?</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      Click the microphone button and speak your rental requirements (e.g., "Show me 2BHK apartments in Koramangala under 40k"). Gemini 3.6 Flash extracts your filters, queries the database, and builds a grounded shortlist.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-teal-300 text-sm">Q: Where does neighborhood information come from?</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      Neighborhood background is retrieved from verified local records using <code className="text-teal-400 font-mono">BAAI/bge-small-en-v1.5</code> vector embeddings. Citations are transparently mapped to original source URLs in the "References" panel.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-teal-300 text-sm">Q: How are safety questions handled?</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      Safety inquiries state verified public crime statistics without emitting subjective or binary "safe/unsafe" ratings. If evidence is lacking for a specific street, the system informs you that verified information is unavailable.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-teal-300 text-sm">Q: How do I book a site visit?</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      Click "Schedule Visit" on any property card, choose your preferred date and time slot, and receive an instant confirmation booking code.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-slate-900/60 flex justify-end">
              <button
                onClick={closeModal}
                className="bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs px-5 py-2 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
