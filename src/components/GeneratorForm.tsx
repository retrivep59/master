"use client";

import { useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import ImageUploader from "./ImageUploader";
import VideoSettings, { VideoSettingsValues } from "./VideoSettings";
import VideoOutput from "./VideoOutput";

const DEFAULT_SETTINGS: VideoSettingsValues = {
  motionBucketId: 127,
  fps: 6,
  numFrames: 14,
  condAug: 0.02,
  decodeChunkSize: 14,
};

export default function GeneratorForm() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<VideoSettingsValues>(DEFAULT_SETTINGS);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState(0);

  const handleGenerate = async () => {
    if (!imageUrl) {
      alert("Please upload or provide an image first.");
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          motionBucketId: settings.motionBucketId,
          fps: settings.fps,
          numFrames: settings.numFrames,
          condAug: settings.condAug,
          decodeChunkSize: settings.decodeChunkSize,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Generation failed");
      }

      // Replicate returns array of URLs or a single URL
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      setVideoUrl(url);
      setGenerationCount((c) => c + 1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div className="space-y-5">
        <ImageUploader
          onImageSelected={(url) => {
            setImageUrl(url || null);
            setVideoUrl(null);
            setError(null);
          }}
          currentImage={imageUrl}
        />

        <VideoSettings values={settings} onChange={setSettings} />

        <button
          onClick={handleGenerate}
          disabled={loading || !imageUrl}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-900/30 text-base"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Video
            </>
          )}
        </button>

        {generationCount > 0 && (
          <p className="text-center text-gray-500 text-sm">
            <Zap className="inline w-3.5 h-3.5 mr-1 text-yellow-500" />
            {generationCount} video{generationCount !== 1 ? "s" : ""} generated this session
          </p>
        )}
      </div>

      {/* Right: Output */}
      <div>
        <VideoOutput
          videoUrl={videoUrl}
          loading={loading}
          error={error}
          onRegenerate={handleGenerate}
        />
      </div>
    </div>
  );
}
