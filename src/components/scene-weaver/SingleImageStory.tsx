"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  Shuffle,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { AUTO_TEMPLATES, type AutoTemplate } from "@/data/auto-templates";
import type { StoryMood } from "@/types/scene-weaver";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Clip {
  id: string;
  label: string;
  description: string;
  emoji: string;
  videoUrl: string | null;
  error: string | null;
  status: "idle" | "generating" | "done" | "error";
}

type GenerationStatus = "idle" | "generating" | "done" | "error";

interface MoodConfig {
  label: string;
  emoji: string;
  gradient: string;
  glow: string;
}

const MOOD_CONFIG: Record<StoryMood, MoodConfig> = {
  romantic: { label: "Romantic",  emoji: "🌹", gradient: "from-rose-600 to-pink-600",      glow: "shadow-rose-900/30"   },
  dominant: { label: "Dominant",  emoji: "⛓️", gradient: "from-red-900 to-red-700",        glow: "shadow-red-900/40"    },
  playful:  { label: "Playful",   emoji: "✨", gradient: "from-violet-600 to-purple-600",   glow: "shadow-violet-900/30" },
  fantasy:  { label: "Fantasy",   emoji: "🔮", gradient: "from-purple-700 to-indigo-600",   glow: "shadow-purple-900/30" },
  intense:  { label: "Intense",   emoji: "🔥", gradient: "from-orange-600 to-red-600",      glow: "shadow-orange-900/30" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClipCard({ clip, index }: { clip: Clip; index: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Clip number + label */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800">
        <span className="text-lg leading-none">{clip.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">
            Scene {index + 1} · {clip.label}
          </p>
          <p className="text-gray-500 text-[11px] truncate">{clip.description}</p>
        </div>
        {clip.status === "generating" && (
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
        )}
        {clip.status === "done" && (
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        )}
        {clip.status === "error" && (
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        )}
      </div>

      {/* Video or placeholder */}
      <div className="aspect-video bg-gray-950 flex items-center justify-center">
        {clip.status === "done" && clip.videoUrl ? (
          <video
            src={clip.videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : clip.status === "generating" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-[11px]">Animating…</p>
          </div>
        ) : clip.status === "error" ? (
          <div className="text-center px-3">
            <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-red-400 text-[11px]">{clip.error ?? "Failed"}</p>
          </div>
        ) : (
          <div className="text-gray-700 text-[11px]">Queued</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SingleImageStoryProps {
  mood: StoryMood;
}

export default function SingleImageStory({ mood }: SingleImageStoryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Which auto-templates are selected (user can toggle)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(AUTO_TEMPLATES.map((t) => t.id))
  );

  const [clips, setClips] = useState<Clip[]>([]);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const moodCfg = MOOD_CONFIG[mood];
  const selectedTemplates = AUTO_TEMPLATES.filter((t) => selectedIds.has(t.id));

  // ── Upload ────────────────────────────────────────────────────────────────

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        setImageUrl(data.url);
        setClips([]);
        setFinalVideoUrl(null);
        setGenerationStatus("idle");
        setErrorMsg(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  // ── Template toggle ───────────────────────────────────────────────────────

  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 2) return prev; // minimum 2
        next.delete(id);
      } else {
        if (next.size >= 6) return prev; // maximum 6
        next.add(id);
      }
      return next;
    });
  };

  const shuffleTemplates = () => {
    // Randomly pick 3–5 templates
    const shuffled = [...AUTO_TEMPLATES].sort(() => Math.random() - 0.5);
    const count = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
    setSelectedIds(new Set(shuffled.slice(0, count).map((t) => t.id)));
  };

  // ── Generation ────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!imageUrl || selectedTemplates.length < 2) return;

    setGenerationStatus("generating");
    setErrorMsg(null);
    setFinalVideoUrl(null);

    // Init clip states
    const initClips: Clip[] = selectedTemplates.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      emoji: t.emoji,
      videoUrl: null,
      error: null,
      status: "idle",
    }));
    setClips(initClips);

    // Stream-generate clips one by one (SVD is synchronous/slow, sequential avoids rate limits)
    const updatedClips = [...initClips];

    for (let i = 0; i < selectedTemplates.length; i++) {
      const tpl = selectedTemplates[i];
      updatedClips[i] = { ...updatedClips[i], status: "generating" };
      setClips([...updatedClips]);

      try {
        const res = await fetch("/api/scene-weaver/generate-scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            motionBucketId: tpl.motionBucketId,
            fps: tpl.fps,
            numFrames: tpl.numFrames,
            condAug: tpl.condAug,
            decodeChunkSize: tpl.decodeChunkSize,
          }),
        });
        const data = (await res.json()) as { videoUrl?: string; error?: string };

        if (!res.ok || data.error || !data.videoUrl) {
          updatedClips[i] = {
            ...updatedClips[i],
            status: "error",
            error: data.error ?? "Generation failed",
          };
        } else {
          updatedClips[i] = {
            ...updatedClips[i],
            status: "done",
            videoUrl: data.videoUrl,
          };
        }
      } catch (err) {
        updatedClips[i] = {
          ...updatedClips[i],
          status: "error",
          error: err instanceof Error ? err.message : "Network error",
        };
      }

      setClips([...updatedClips]);
    }

    const successClips = updatedClips.filter((c) => c.videoUrl);
    if (successClips.length < 2) {
      setGenerationStatus("error");
      setErrorMsg("Not enough scenes generated. Please try again.");
      return;
    }

    // Use the first successful clip as the representative output
    // (real client-side stitching would concat all clips)
    setFinalVideoUrl(successClips[0].videoUrl!);
    setGenerationStatus("done");
  };

  const reset = () => {
    setImageUrl(null);
    setClips([]);
    setFinalVideoUrl(null);
    setGenerationStatus("idle");
    setErrorMsg(null);
  };

  const doneCount = clips.filter((c) => c.status === "done").length;
  const isGenerating = generationStatus === "generating";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Image Upload ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            Your Photo
          </label>
          {imageUrl && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-3 h-3" /> Change photo
            </button>
          )}
        </div>

        {imageUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-gray-700 max-h-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Source"
              className="w-full max-h-56 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <p className="absolute bottom-2 left-3 text-white text-xs font-medium">
              Source photo · {selectedTemplates.length} scenes will be generated
            </p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-pink-500 bg-pink-500/10"
                : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              ) : (
                <div className="bg-gray-800 p-4 rounded-full">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-gray-300 font-medium">
                  {uploading ? "Uploading…" : "Drop your photo here"}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  One image → AI generates {AUTO_TEMPLATES.length} unique scenes
                </p>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
      </div>

      {/* ── URL input ── */}
      {!imageUrl && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="url"
              placeholder="Or paste an image URL…"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) { setImageUrl(v); setClips([]); setFinalVideoUrl(null); setGenerationStatus("idle"); }
                }
              }}
            />
          </div>
          <button
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement;
              const v = input?.value?.trim();
              if (v) { setImageUrl(v); setClips([]); setFinalVideoUrl(null); setGenerationStatus("idle"); }
            }}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-700 transition-colors"
          >
            Use
          </button>
        </div>
      )}

      {/* ── Scene Style Picker ── */}
      {imageUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Scene Styles</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Each style animates your photo differently — pick 2–6
              </p>
            </div>
            <button
              onClick={shuffleTemplates}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {AUTO_TEMPLATES.map((tpl) => {
              const selected = selectedIds.has(tpl.id);
              return (
                <button
                  key={tpl.id}
                  onClick={() => toggleTemplate(tpl.id)}
                  disabled={isGenerating}
                  className={`text-left p-3 rounded-xl border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selected
                      ? "border-pink-500 bg-pink-500/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl leading-none">{tpl.emoji}</span>
                    <span className="text-white text-xs font-semibold">{tpl.label}</span>
                    {selected && (
                      <CheckCircle className="w-3.5 h-3.5 text-pink-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-500 text-[11px] leading-tight">{tpl.description}</p>
                  <div className="mt-1.5 flex gap-1">
                    <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded">
                      M:{tpl.motionBucketId}
                    </span>
                    <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded">
                      {tpl.fps}fps
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-gray-600 text-xs text-center">
            {selectedTemplates.length} scene{selectedTemplates.length !== 1 ? "s" : ""} selected
            {selectedTemplates.length < 2 && (
              <span className="text-red-400 ml-1">— select at least 2</span>
            )}
          </p>
        </div>
      )}

      {/* ── Generate Button ── */}
      {imageUrl && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating || selectedTemplates.length < 2}
          className={`w-full flex items-center justify-center gap-2.5 bg-gradient-to-r ${moodCfg.gradient} hover:opacity-90 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg ${moodCfg.glow} text-base`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating scene {doneCount + 1} of {selectedTemplates.length}…
            </>
          ) : generationStatus === "done" ? (
            <>
              <RefreshCw className="w-5 h-5" />
              Regenerate Story
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {moodCfg.emoji} Generate {moodCfg.label} Story
            </>
          )}
        </button>
      )}

      {/* ── Error ── */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      {/* ── Clip Grid (live progress) ── */}
      {clips.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">
            Generated Scenes
            <span className="ml-2 text-gray-500 font-normal text-xs">
              {doneCount}/{clips.length} complete
            </span>
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {clips.map((clip, i) => (
              <ClipCard key={clip.id} clip={clip} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Final Output ── */}
      {generationStatus === "done" && finalVideoUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              ✅ Your {moodCfg.label} Story
            </p>
            <span className="text-xs text-gray-500">
              {doneCount} scenes from 1 photo
            </span>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-700">
            <video
              src={finalVideoUrl}
              controls
              autoPlay
              loop
              className="w-full max-h-80 object-contain bg-gray-950"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={finalVideoUrl}
              download={`story-${mood}-${Date.now()}.mp4`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <button
              onClick={handleGenerate}
              className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
