"use client";

import { CheckCircle, Loader2, AlertCircle, Circle } from "lucide-react";
import type { Scene, StoryStatus } from "@/types/scene-weaver";

interface SceneProgressProps {
  scenes: Scene[];
  status: StoryStatus;
}

export default function SceneProgress({ scenes, status }: SceneProgressProps) {
  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(192,0,106,0.2)" }}
      role="status"
      aria-label="Scene generation progress"
      aria-live="polite"
    >
      <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "#c0006a" }}>
        {status === "stitching" ? "🎬 Stitching final video…" : "⚡ Generating scenes"}
      </p>

      <ol className="space-y-3">
        {scenes.map((scene, index) => (
          <li key={scene.id} className="flex items-center gap-3">
            <span className="flex-shrink-0 relative z-10">
              {scene.status === "idle"       && <Circle      className="w-4 h-4" style={{ color: "#4a2a4a" }} />}
              {scene.status === "generating" && <Loader2     className="w-4 h-4 animate-spin" style={{ color: "#c0006a" }} />}
              {scene.status === "done"       && <CheckCircle className="w-4 h-4" style={{ color: "#4ade80" }} />}
              {scene.status === "error"      && <AlertCircle className="w-4 h-4" style={{ color: "#f87171" }} />}
            </span>

            <span className="text-sm" style={{ color: scene.status === "generating" ? "#ff69b4" : "#9a6a8a" }}>
              Scene {index + 1}
              {scene.caption && (
                <span className="text-xs ml-1.5 truncate" style={{ color: "#4a2a4a" }}>— {scene.caption}</span>
              )}
            </span>

            <span className="ml-auto text-xs capitalize" style={{ color: "#7a4a7a" }}>
              {scene.status === "generating" ? "Animating…" : scene.status}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
