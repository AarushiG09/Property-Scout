import React, { useState } from "react";
import { Building2, Sparkles, Mail, Lock, ArrowRight, ShieldCheck, Navigation } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (userRole: "buyer" | "seller") => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("agent@propertyscout.ai");
  const [password, setPassword] = useState("••••••••••••");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess("buyer");
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(11, 15, 26, 0.85), rgba(11, 15, 26, 0.85)), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1920&q=80')`
      }}
    >
      {/* Background Decorative Glowing Orbs */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="w-full max-w-md relative z-10 flex flex-col items-center my-auto">
        
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center w-full">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 p-0.5 shadow-xl shadow-teal-950/60">
              <div className="w-full h-full bg-[#0B0F1A] rounded-[14px] flex items-center justify-center text-teal-400">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              Property Scout
            </h1>
          </div>
          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" /> AI Voice Real Estate Agent Portal
          </span>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="bg-[#131B2E]/90 border border-white/10 rounded-3xl shadow-2xl p-8 w-full backdrop-blur-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Sign In to Your Workspace</h2>
            <p className="text-xs text-gray-400 mt-1">
              Access voice-driven listings search, RAG locality intelligence, and seller listing tools.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Work Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-gray-300">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Enter your credentials and click Sign In to access the portal."); }} className="text-teal-400 hover:underline">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-lg shadow-teal-950/60 flex items-center justify-center gap-2 mt-2"
            >
              Sign In to Agent Portal <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* System Capabilities Footer */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-[11px] text-gray-400 max-w-md">
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Spoken Voice Search</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Navigation className="w-4 h-4 text-teal-400" />
            <span>OSM Transit Math</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Zero PII Exposure</span>
          </div>
        </div>

      </main>
    </div>
  );
};
