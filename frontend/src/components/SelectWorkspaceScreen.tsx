import React from "react";
import { Building2, ShoppingBag, Tag, ArrowRight, Sparkles, Navigation, ShieldCheck, BookOpen, LogOut, CheckCircle2 } from "lucide-react";

interface SelectWorkspaceScreenProps {
  onSelectWorkspace: (workspace: "buy" | "sell") => void;
  onLogout: () => void;
}

export const SelectWorkspaceScreen: React.FC<SelectWorkspaceScreenProps> = ({
  onSelectWorkspace,
  onLogout
}) => {
  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] text-white flex flex-col relative overflow-hidden selection:bg-teal-600 selection:text-white">
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="w-full bg-[#0B0F1A]/90 backdrop-blur-md border-b border-white/10 px-6 py-4 relative z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 p-0.5 shadow-md">
              <div className="w-full h-full bg-[#0B0F1A] rounded-[10px] flex items-center justify-center text-teal-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Property Scout</h1>
              <p className="text-[11px] text-gray-400">Bengaluru Metropolitan Region</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="bg-slate-900 hover:bg-slate-800 text-gray-300 border border-white/10 text-xs font-medium px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center relative z-10 space-y-8">
        
        {/* Workspace Selection Headline */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Workspace Selector
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Choose Your Real Estate Workspace
          </h2>
          <p className="text-sm text-gray-300">
            Select a tailored environment to browse voice-driven listings or list new properties for rent in Bengaluru.
          </p>
        </div>

        {/* 2 Workspace Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4">
          
          {/* Workspace A: Buy / Rent Mode */}
          <div
            onClick={() => onSelectWorkspace("buy")}
            className="bg-[#131B2E] border border-white/10 hover:border-teal-500/60 rounded-3xl p-8 flex flex-col justify-between shadow-2xl hover:shadow-teal-950/40 transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-teal-500/20 transition-colors" />

            <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
                <ShoppingBag className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">
                  Buyer / Renter Portal
                </span>
                <h3 className="text-2xl font-bold text-white group-hover:text-teal-300 transition-colors mt-1">
                  Buy & Rent Workspace
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mt-2">
                  Explore active rental inventory using voice search. Get OpenStreetMap transit calculations and grounded RAG locality insights.
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-2 text-xs text-gray-300 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>AI Voice Search & Shortlist Refinement</span>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Nearest Metro & Transit POI Snapshots</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Grounding Source Citations & Site Visit Booking</span>
                </div>
              </div>
            </div>

            <div className="pt-8 relative z-10">
              <button
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-teal-950/60 flex items-center justify-center gap-2 group-hover:gap-3"
              >
                Enter Buy Workspace <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Workspace B: Sell / List Mode */}
          <div
            onClick={() => onSelectWorkspace("sell")}
            className="bg-[#131B2E] border border-white/10 hover:border-emerald-500/60 rounded-3xl p-8 flex flex-col justify-between shadow-2xl hover:shadow-emerald-950/40 transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />

            <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Tag className="w-7 h-7" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  Property Agent Portal
                </span>
                <h3 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors mt-1">
                  Sell & List Workspace
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mt-2">
                  Put new rental properties up for sale or lease. Guided step-by-step metadata creation with automatic PII sanitization.
                </p>
              </div>

              {/* Highlights List */}
              <div className="space-y-2 text-xs text-gray-300 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>5-Step Guided Listing Creation Wizard</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automatic Owner PII Redaction Audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>RAG Vector Ingestion & Active Buyer Matching</span>
                </div>
              </div>
            </div>

            <div className="pt-8 relative z-10">
              <button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 group-hover:gap-3"
              >
                Enter Sell Workspace <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
