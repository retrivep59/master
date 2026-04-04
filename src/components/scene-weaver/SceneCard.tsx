"use client";

import type { DragEvent } from "react";
import { Edit2 } from "lucide-react";
import type { Scene } from "@/types/scene-weaver";

const STATUS_BADGE: Record<Scene["status"], { label: string; style: React.CSSProperties }> = {
  idle:       { label: "Ready",       style: { background: "rgba(255,255,255,0.06)", color: "#7a4a7a" } },
  generating: { label: "Animating…", style: { background: "rgba(192,0,106,0.2)",   color: "#ff69b4" } },
  done:       { label: "Done ✓",     style: { background: "rgba(0,180,80,0.15)",    color: "#4ade80" } },
  error:      { label: "Error",       style: { background: "rgba(180,0,0,0.2)",      color: "#f87171" } },
};

interface SceneCardProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver:  (e: DragEvent<HTMLDivElement>) => void;
  onDrop:      (e: DragEvent<HTMLDivElement>) => void;
}

export default function SceneCard({
  scene, index, isSelected, onClick, onDragStart, onDragOver, onDrop,
}: SceneCardProps) {
  const badge = STATUS_BADGE[scene.status];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="w-36 rounded-xl overflow-hidden cursor-pointer transition-all duration-150 select-none"
      style={{
        border: isSelected
          ? "1px solid #c0006a"
          : "1px solid rgba(192,0,106,0.15)",
        boxShadow: isSelected ? "0 0 16px rgba(192,0,106,0.35)" : "none",
      }}
      role="button"
      aria-label={`Scene ${index + 1}${scene.caption ? `: ${scene.caption}` : ""}`}
      aria-pressed={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4]" style={{ background: "#100010" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />

        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: "rgba(192,0,106,0.8)" }}>
          {index + 1}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-150"
          style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-full p-2" style={{ background: "rgba(192,0,106,0.5)" }}>
            <Edit2 className="w-4 h-4 text-white" />
          </div>
        </div>

        {scene.status === "generating" && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#c0006a", borderTopColor: "transparent" }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-2 space-y-1" style={{ background: "rgba(8,0,8,0.9)" }}>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={badge.style}>
          {badge.label}
        </span>
        {scene.caption ? (
          <p className="text-xs truncate leading-tight" style={{ color: "#9a6a8a" }}>{scene.caption}</p>
        ) : (
          <p className="text-xs leading-tight" style={{ color: "#4a2a4a" }}>No caption</p>
        )}
        <p className="text-[10px]" style={{ color: "#4a2a4a" }}>{scene.duration}s</p>
      </div>
    </div>
  );
}
