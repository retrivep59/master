"use client";

import { useState, useEffect } from "react";
import AgeVerification from "./AgeVerification";
import GeneratorForm from "./GeneratorForm";
import { Film, Clapperboard, Flame } from "lucide-react";

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
    <div className="min-h-screen text-white pb-20 md:pb-0" style={{ background: "#080008" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b" style={{ background: "rgba(8,0,8,0.92)", borderColor: "rgba(192,0,106,0.2)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: "linear-gradient(135deg, #c0006a, #7a00c0)" }}>
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-black text-base leading-none tracking-tight">ImageMotion <span className="text-xs font-bold px-1.5 py-0.5 rounded align-middle" style={{ background: "rgba(192,0,106,0.2)", color: "#ff4da6" }}>18+</span></h1>
              <p className="text-[10px] mt-0.5 hidden sm:block" style={{ color: "#c0006a" }}>AI Adult Video Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/scene-weaver"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
              style={{ background: "rgba(192,0,106,0.15)", border: "1px solid rgba(192,0,106,0.4)", color: "#ff4da6" }}>
              🎬 Story Mode
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "#c0006a", color: "white" }}>NEW</span>
            </a>
            <div className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full"
              style={{ background: "rgba(192,0,106,0.1)", border: "1px solid rgba(192,0,106,0.25)", color: "#ff4da6" }}>
              <Flame className="w-3 h-3" />
              <span className="hidden sm:inline">NSFW Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-48 opacity-20 blur-3xl rounded-full" style={{ background: "radial-gradient(circle, #c0006a, transparent)" }} />
          <div className="absolute top-0 right-1/4 w-96 h-48 opacity-15 blur-3xl rounded-full" style={{ background: "radial-gradient(circle, #7a00c0, transparent)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-4">
          <h2 className="text-2xl md:text-3xl font-black mb-1.5 tracking-tight">
            Turn Photos into{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #ff4da6, #c0006a, #7a00c0)" }}>
              Explicit Videos
            </span>
          </h2>
          <p className="text-sm" style={{ color: "#9a7a9a" }}>
            Upload any adult image · choose a motion style · AI generates your fantasy video
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-8">
        <GeneratorForm />

        {/* Feature pills */}
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            { icon: "🎭", text: "50 Adult Templates" },
            { icon: "🔥", text: "9 Kink Categories" },
            { icon: "💦", text: "HD Video Output" },
            { icon: "🔒", text: "100% Private" },
            { icon: "⚡", text: "Free to Generate" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full"
              style={{ background: "rgba(192,0,106,0.1)", border: "1px solid rgba(192,0,106,0.2)", color: "#ff4da6" }}>
              {f.icon} {f.text}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl p-3" style={{ background: "rgba(192,0,106,0.05)", border: "1px solid rgba(192,0,106,0.15)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "#7a5a7a" }}>
            <strong style={{ color: "#c0006a" }}>⚠️ 18+ Only:</strong> Content is AI-generated adult fantasy. No real persons depicted. Users are solely responsible for content they generate. No minors. No non-consensual scenarios.
          </p>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t"
        style={{ background: "rgba(8,0,8,0.97)", borderColor: "rgba(192,0,106,0.2)", paddingBottom: "env(safe-area-inset-bottom)", backdropFilter: "blur(12px)" }}>
        <div className="flex">
          <a href="/" className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 border-t-2" style={{ borderColor: "#c0006a", color: "#ff4da6" }}>
            <Film className="w-5 h-5" />
            <span className="text-[10px] font-bold">Generator</span>
          </a>
          <a href="/scene-weaver" className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5" style={{ color: "#5a3a5a" }}>
            <Clapperboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">Story Mode</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
