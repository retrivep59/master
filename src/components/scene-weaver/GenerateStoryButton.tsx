"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { Scene, StoryMood, StoryStatus } from "@/types/scene-weaver";
import { TEMPLATES } from "@/data/templates";

const DEFAULT_SETTINGS = {
  motionBucketId: 110,
  fps: 8,
  numFrames: 20,
  condAug: 0.03,
  decodeChunkSize: 14,
};

interface GenerateStoryButtonProps {
  scenes: Scene[];
  mood: StoryMood;
  onSceneUpdate: (id: string, updates: Partial<Scene>) => void;
  onFinalVideo: (url: string) => void;
  onStatusChange: (status: StoryStatus) => void;
}

export default function GenerateStoryButton({
  scenes,
  mood,
  onSceneUpdate,
  onFinalVideo,
  onStatusChange,
}: GenerateStoryButtonProps) {
  const [progress, setProgress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canGenerate = scenes.length >= 2 && scenes.every((s) => s.imageUrl);

  const getSettings = (scene: Scene) => {
    if (scene.templateId) {
      const tpl = TEMPLATES.find((t) => t.id === scene.templateId);
      if (tpl) return tpl.settings;
    }
    return DEFAULT_SETTINGS;
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    onStatusChange("generating");

    try {
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        setProgress(`Animating scene ${i + 1} of ${scenes.length}…`);
        onSceneUpdate(scene.id, { status: "generating" });

        const settings = getSettings(scene);
        const res = await fetch("/api/scene-weaver/generate-scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: scene.imageUrl, ...settings }),
        });
        const data = await res.json() as { videoUrl?: string; error?: string };

        if (!res.ok || data.error) {
          onSceneUpdate(scene.id, { status: "error", error: data.error ?? "Failed" });
          continue;
        }
        onSceneUpdate(scene.id, { status: "done", videoUrl: data.videoUrl });
      }

      setProgress("Stitching your story…");
      onStatusChange("stitching");

      const doneScenes = scenes.filter((s) => s.videoUrl);
      if (doneScenes.length < 2) throw new Error("Not enough scenes generated");

      const stitchRes = await fetch("/api/scene-weaver/stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrls: doneScenes.map((s) => s.videoUrl),
          captions: doneScenes.map((s) => s.caption),
          mood,
          transitionType: "fade",
        }),
      });
      const stitchData = await stitchRes.json() as { clips?: Array<{ url: string }>; error?: string };

      if (!stitchRes.ok || stitchData.error) throw new Error(stitchData.error ?? "Stitch failed");

      const firstUrl = stitchData.clips?.[0]?.url ?? doneScenes[0]?.videoUrl ?? "";
      onFinalVideo(firstUrl);
      onStatusChange("done");
    } catch (err) {
      console.error(err);
      onStatusChange("error");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        className="w-full flex items-center justify-center gap-2.5 text-white font-black py-4 px-6 rounded-xl transition-all active:scale-95 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: loading || !canGenerate
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg, #c0006a, #7a00c0)",
          boxShadow: loading || !canGenerate ? "none" : "0 0 30px rgba(192,0,106,0.4)",
        }}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            {progress ?? "Generating…"}
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            🔥 Generate Story Video
          </>
        )}
      </button>

      {!canGenerate && !loading && (
        <p className="text-center text-xs" style={{ color: "#7a4a7a" }}>
          {scenes.length < 2
            ? `Add ${2 - scenes.length} more scene${scenes.length === 1 ? "" : "s"} to generate`
            : "All scenes need an image"}
        </p>
      )}
    </div>
  );
}
