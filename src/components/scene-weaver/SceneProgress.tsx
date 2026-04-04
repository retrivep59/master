"use client";

import { CheckCircle, Loader2, AlertCircle, Circle } from "lucide-react";
import type { Scene, StoryStatus } from "@/types/scene-weaver";

interface SceneProgressProps {
  scenes: Scene[];
  status: StoryStatus;
}

const STATUS_ICON: Record<
  Scene["status"],
  { icon: React.ReactNode; lineClass: string }
> = {
  idle: {
    icon: <Circle className="w-4 h-4 text-gray-600" aria-hidden="true" />,
    lineClass: "bg-gray-700",
  },
  generating: {
    icon: (
      <Loader2
        className="w-4 h-4 text-yellow-400 animate-spin"
        aria-hidden="true"
      />
    ),
    lineClass: "bg-yellow-500/40",
  },
  done: {
    icon: <CheckCircle className="w-4 h-4 text-green-400" aria-hidden="true" />,
    lineClass: "bg-green-500/40",
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 text-red-400" aria-hidden="true" />,
    lineClass: "bg-red-500/40",
  },
};

export default function SceneProgress({ scenes, status }: SceneProgressProps) {
  return (
    <div
      className="bg-gray-900/60 border border-gray-800 rounded-xl px-5 py-4"
      role="status"
      aria-label="Scene generation progress"
      aria-live="polite"
    >
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {status === "stitching" ? "Stitching final video…" : "Generating scenes"}
      </p>

      <ol className="space-y-3">
        {scenes.map((scene, index) => {
          const { icon, lineClass } = STATUS_ICON[scene.status];
          return (
            <li key={scene.id} className="flex items-center gap-3">
              {/* Connector line */}
              {index < scenes.length - 1 && (
                <span
                  className={`absolute ml-[7px] mt-5 w-0.5 h-4 ${lineClass}`}
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <span className="flex-shrink-0 relative z-10">{icon}</span>

              {/* Label */}
              <span className="text-sm text-gray-300">
                Scene {index + 1}
                {scene.caption && (
                  <span className="text-gray-500 text-xs ml-1.5 truncate">
                    — {scene.caption}
                  </span>
                )}
              </span>

              {/* Status label */}
              <span className="ml-auto text-xs text-gray-500 capitalize">
                {scene.status === "generating" ? "Animating…" : scene.status}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
