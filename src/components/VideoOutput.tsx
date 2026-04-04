"use client";

import { Download, RefreshCw, Video } from "lucide-react";

interface VideoOutputProps {
  videoUrl: string | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
}

export default function VideoOutput({
  videoUrl,
  loading,
  error,
  onRegenerate,
}: VideoOutputProps) {
  const handleDownload = async () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `generated-video-${Date.now()}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Generated Video
      </label>

      <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-900 min-h-64 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative">
              <div className="w-14 h-14 border-3 border-gray-700 rounded-full" />
              <div className="absolute inset-0 w-14 h-14 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Generating video...</p>
              <p className="text-gray-500 text-sm mt-1">
                This may take 30–120 seconds
              </p>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
            <div className="bg-red-500/10 text-red-400 text-4xl p-4 rounded-full">
              ✕
            </div>
            <div>
              <p className="text-white font-medium">Generation Failed</p>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={onRegenerate}
              className="mt-2 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            className="w-full max-h-96 object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-gray-600">
            <div className="bg-gray-800 p-4 rounded-full">
              <Video className="w-8 h-8" />
            </div>
            <p className="text-sm">
              Upload an image and click <span className="text-purple-400 font-medium">Generate</span> to create a video
            </p>
          </div>
        )}
      </div>

      {videoUrl && !loading && (
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Download Video
        </button>
      )}
    </div>
  );
}
