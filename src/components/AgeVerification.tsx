"use client";

import { useState } from "react";

interface AgeVerificationProps {
  onVerify: () => void;
}

export default function AgeVerification({ onVerify }: AgeVerificationProps) {
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080008" }}>
        <div className="text-center text-white">
          <p className="text-4xl mb-4">🚫</p>
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm">You must be 18 or older to enter.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at center, #1a0018 0%, #080008 70%)",
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #c0006a 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <div className="relative max-w-sm w-full text-center">
        {/* Logo mark */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl mb-4"
            style={{ background: "linear-gradient(135deg, #c0006a, #7a00c0)", boxShadow: "0 0 40px rgba(192,0,106,0.5)" }}>
            🔞
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ImageMotion</h1>
          <p className="text-xs uppercase tracking-[0.3em] mt-1" style={{ color: "#c0006a" }}>Adults Only · 18+</p>
        </div>

        {/* Warning card */}
        <div className="rounded-2xl p-5 mb-5 text-left"
          style={{ background: "rgba(192,0,106,0.08)", border: "1px solid rgba(192,0,106,0.25)" }}>
          <p className="text-sm text-pink-200 leading-relaxed mb-3">
            This platform contains <strong className="text-white">explicit adult content</strong> including nudity, sexual imagery, and animated adult videos.
          </p>
          <ul className="space-y-1.5 text-xs text-pink-300/80">
            {[
              "I am 18 years of age or older",
              "Adult content is legal in my jurisdiction",
              "I consent to viewing sexually explicit material",
              "I understand all content is AI-generated",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-pink-500 mt-0.5 flex-shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <button
          onClick={onVerify}
          className="w-full text-white font-black py-4 px-6 rounded-xl text-base mb-3 transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #c0006a, #7a00c0)",
            boxShadow: "0 0 30px rgba(192,0,106,0.4)",
          }}
        >
          🔞 Enter — I&apos;m 18+
        </button>
        <button
          onClick={() => setDeclined(true)}
          className="w-full py-3 px-6 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.05)", color: "#888", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          I&apos;m under 18 — Exit
        </button>

        <p className="text-gray-700 text-xs mt-5">All content is AI-generated fantasy. No real persons depicted.</p>
      </div>
    </div>
  );
}
