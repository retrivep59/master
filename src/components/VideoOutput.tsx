"use client";

import { Download, RefreshCw } from "lucide-react";

interface VideoOutputProps {
  videoUrl: string | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
}

export default function VideoOutput({ videoUrl, loading, error, onRegenerate }: VideoOutputProps) {
  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `imagemotion-${Date.now()}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-black text-white uppercase tracking-widest">
        🎬 Your Video
      </label>

      <div className="rounded-2xl overflow-hidden min-h-64 flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(192,0,106,0.2)" }}>

        {loading ? (
          <div className="flex flex-col items-center gap-5 py-14 px-6 text-center">
            {/* Pulsing ring */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "#c0006a" }} />
              <div className="absolute inset-2 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#c0006a" }} />
              <div className="absolute inset-0 flex items-center justify-center text-xl">💦</div>
            </div>
            <div>
              <p className="text-white font-bold">Generating your video…</p>
              <p className="text-xs mt-1" style={{ color: "#7a4a7a" }}>AI is working its magic · 30–120 seconds</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "#c0006a", animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
            <div className="text-4xl">⚠️</div>
            <div>
              <p className="text-white font-bold text-sm">Generation Failed</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: "#c05050" }}>{error}</p>
            </div>
            <button onClick={onRegenerate}
              className="mt-2 flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95"
              style={{ background: "rgba(192,0,106,0.2)", border: "1px solid rgba(192,0,106,0.4)" }}>
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : videoUrl ? (
          <video src={videoUrl} controls autoPlay loop muted className="w-full max-h-96 object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="text-5xl opacity-30">🎬</div>
            <p className="text-xs" style={{ color: "#5a3a5a" }}>
              Upload a photo · pick a style · hit <span className="font-bold" style={{ color: "#c0006a" }}>Generate</span>
            </p>
          </div>
        )}
      </div>

      {videoUrl && !loading && (
        <button onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-sm"
          style={{ background: "linear-gradient(135deg, #c0006a, #7a00c0)", boxShadow: "0 0 20px rgba(192,0,106,0.3)" }}>
          <Download className="w-4 h-4" /> Download HD Video
        </button>
      )}
    </div>
  );
}
