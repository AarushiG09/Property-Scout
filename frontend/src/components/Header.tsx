import React from "react";
import { Building2, ShoppingBag, Tag, PlusCircle, Sparkles, MapPin, Grid, LogOut } from "lucide-react";

interface HeaderProps {
  activeTab: "buy" | "sell";
  onTabChange: (tab: "buy" | "sell") => void;
  onSwitchWorkspace: () => void;
  onLogout: () => void;
  onNewSearch?: () => void;
  onAddProperty?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onSwitchWorkspace,
  onLogout,
  onNewSearch,
  onAddProperty
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0F1A]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 p-0.5 shadow-md shadow-teal-900/40">
            <div className="w-full h-full bg-[#0B0F1A] rounded-[10px] flex items-center justify-center text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-white tracking-tight">Property Scout</h1>
              <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Voice AI
              </span>
            </div>
            <p className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-400" /> Bengaluru Real Estate Workspace
            </p>
          </div>
        </div>

        {/* Mode Toggle Switch: Buy vs Sell */}
        <div className="bg-slate-900/90 p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner">
          <button
            onClick={() => onTabChange("buy")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === "buy"
                ? "bg-teal-600 text-white shadow-md shadow-teal-900/50"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Buy Workspace
          </button>

          <button
            onClick={() => onTabChange("sell")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === "sell"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/50"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Sell Workspace
          </button>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchWorkspace}
            title="Switch Workspace"
            className="bg-slate-900 hover:bg-slate-800 text-gray-300 border border-white/10 text-xs font-medium px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Grid className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Choose Workspace</span>
          </button>

          <button
            onClick={onLogout}
            title="Log Out"
            className="bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-rose-400 border border-white/10 text-xs p-2 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {activeTab === "buy" ? (
            <button
              onClick={onNewSearch}
              className="bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 border border-teal-500/30 text-xs font-medium px-3.5 py-2 rounded-xl transition-all hidden sm:flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Reset Search
            </button>
          ) : (
            <button
              onClick={onAddProperty}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all hidden sm:flex items-center gap-1.5 shadow-md shadow-emerald-900/50"
            >
              <PlusCircle className="w-4 h-4" />
              Add Listing
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
