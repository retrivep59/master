"use client";

import { useState, useEffect } from "react";
import AgeVerification from "./AgeVerification";
import GeneratorForm from "./GeneratorForm";
import { Film, Shield, Clapperboard } from "lucide-react";

export default function MainApp() {
  const [verified, setVerified] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem("age_verified");
    if (stored === "true") setVerified(true);
  }, []);

  const handleVerify = () => {
    sessionStorage.setItem("age_verified", "true");
    setVerified(true);
  };

  if (!mounted) return null;
  if (!verified) return <AgeVerification onVerify={handleVerify} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-1.5 rounded-lg">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none">ImageMotion AI</h1>
              <p className="text-gray-500 text-[10px] mt-0.5 hidden sm:block">NSFW Image to Video</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/scene-weaver"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors"
            >
              🎬 Story Mode
              <span className="bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">NEW</span>
            </a>
            <div className="flex items-center gap-1 bg-green-500/10 text-green-400 text-[10px] font-medium px-2.5 py-1.5 rounded-full border border-green-500/20">
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">Age Verified</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-5 md:py-8">
        <div className="mb-5">
          <h2 className="text-xl md:text-2xl font-bold mb-1.5">
            Transform Images into{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Videos
            </span>
          </h2>
          <p className="text-gray-400 text-sm">Upload a photo — AI animates it into a fluid video clip.</p>
        </div>

        <GeneratorForm />

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Stable Video Diffusion", desc: "High-quality AI motion synthesis", icon: "🎬" },
            { title: "50 Templates", desc: "9 adult categories, one tap to apply", icon: "🎛️" },
            { title: "Private & Secure", desc: "Images never stored long-term", icon: "🔒" },
          ].map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3 sm:flex-col sm:gap-0">
              <div className="text-2xl sm:mb-2 flex-shrink-0">{f.icon}</div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-0.5">{f.title}</h3>
                <p className="text-gray-500 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
          <p className="text-yellow-400/70 text-[11px] leading-relaxed">
            <strong className="text-yellow-400">18+ Only:</strong> All content must comply with applicable laws. No minors or non-consensual content.
          </p>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          <a href="/" className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-purple-400 border-t-2 border-purple-500">
            <Film className="w-5 h-5" />
            <span className="text-[10px] font-medium">Generator</span>
          </a>
          <a href="/scene-weaver" className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-gray-500">
            <Clapperboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Story Mode</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
