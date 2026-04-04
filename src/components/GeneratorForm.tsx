"use client";

import { useState } from "react";
import { Sparkles, Zap } from "lucide-react";
import ImageUploader from "./ImageUploader";
import VideoSettings, { VideoSettingsValues } from "./VideoSettings";
import VideoOutput from "./VideoOutput";
import TemplateGallery from "./TemplateGallery";

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
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationCount, setGenerationCount] = useState(0);

  const handleTemplateSelect = (newSettings: VideoSettingsValues, templateId: string) => {
    setSettings(newSettings);
    setActiveTemplateId(templateId);
  };

  const handleGenerate = async () => {
    if (!imageUrl) return;
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
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      const url = Array.isArray(data.output) ? data.output[0] : data.output;
      setVideoUrl(url);
      setGenerationCount((c) => c + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Templates */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(192,0,106,0.15)" }}>
        <TemplateGallery onSelect={handleTemplateSelect} activeTemplateId={activeTemplateId} />
      </div>

      {/* Generator grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <ImageUploader
            onImageSelected={(url) => { setImageUrl(url || null); setVideoUrl(null); setError(null); }}
            currentImage={imageUrl}
          />

          <VideoSettings values={settings} onChange={(s) => { setSettings(s); setActiveTemplateId(null); }} />

          <button
            onClick={handleGenerate}
            disabled={loading || !imageUrl}
            className="w-full flex items-center justify-center gap-2.5 text-white font-black py-4 px-6 rounded-xl transition-all active:scale-95 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading || !imageUrl ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #c0006a, #7a00c0)",
              boxShadow: loading || !imageUrl ? "none" : "0 0 30px rgba(192,0,106,0.4)",
            }}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {activeTemplateId ? "🔥 Generate with Style" : "Generate Video"}
              </>
            )}
          </button>

          {generationCount > 0 && (
            <p className="text-center text-xs" style={{ color: "#7a4a7a" }}>
              <Zap className="inline w-3 h-3 mr-1" style={{ color: "#c0006a" }} />
              {generationCount} video{generationCount !== 1 ? "s" : ""} generated this session
            </p>
          )}
        </div>

        <VideoOutput videoUrl={videoUrl} loading={loading} error={error} onRegenerate={handleGenerate} />
      </div>
    </div>
  );
}
