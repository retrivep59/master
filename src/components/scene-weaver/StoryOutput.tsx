"use client";

import { Download, Film } from "lucide-react";

interface StoryOutputProps {
  videoUrl: string;
  sceneCount: number;
}

export default function StoryOutput({ videoUrl, sceneCount }: StoryOutputProps) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0d000d", border: "1px solid rgba(192,0,106,0.3)" }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(192,0,106,0.2)" }}>
        <div className="flex items-center gap-2.5">
          <Film className="w-5 h-5" style={{ color: "#c0006a" }} />
          <div>
            <h3 className="font-black text-sm" style={{ color: "#ff69b4" }}>Your Story 🔞</h3>
            <p className="text-xs" style={{ color: "#7a4a7a" }}>
              {sceneCount} scene{sceneCount !== 1 ? "s" : ""} combined
            </p>
          </div>
        </div>

        <a
          href={videoUrl}
          download="sceneweaver-story.mp4"
          aria-label="Download story video"
          className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#c0006a,#7a00c0)", boxShadow: "0 0 16px rgba(192,0,106,0.4)" }}
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      </div>

      {/* Video */}
      <div style={{ background: "#000" }}>
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          playsInline
          className="w-full max-h-[480px]"
          aria-label="Generated story video"
        />
      </div>
    </div>
  );
}
