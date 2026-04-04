"use client";

import { useState, useEffect } from "react";
import AgeVerification from "./AgeVerification";
import GeneratorForm from "./GeneratorForm";
import { Film, Shield } from "lucide-react";

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

  if (!verified) {
    return <AgeVerification onVerify={handleVerify} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-xl">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">ImageMotion AI</h1>
              <p className="text-gray-500 text-xs mt-0.5">NSFW Image to Video Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full border border-green-500/20">
            <Shield className="w-3.5 h-3.5" />
            Age Verified
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Transform Images into{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Videos
            </span>
          </h2>
          <p className="text-gray-400">
            Upload any image and use AI to animate it into a fluid video clip. Powered by Stable Video Diffusion.
          </p>
        </div>

        <GeneratorForm />

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Stable Video Diffusion",
              desc: "Powered by stability.ai's SVD model for high-quality motion synthesis",
              icon: "🎬",
            },
            {
              title: "Full Control",
              desc: "Adjust motion intensity, FPS, frame count, and noise augmentation",
              icon: "🎛️",
            },
            {
              title: "Private & Secure",
              desc: "Your images are processed securely and never stored long-term",
              icon: "🔒",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400/80 text-xs leading-relaxed">
            <strong className="text-yellow-400">Disclaimer:</strong> This tool generates AI content from user-provided images. Users are solely responsible for the images they upload and the content they generate. All generated content must comply with applicable laws. This platform prohibits content depicting minors, non-consensual scenarios, or any illegal material. Misuse will result in immediate access termination.
          </p>
        </div>
      </main>
    </div>
  );
}
