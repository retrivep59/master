"use client";

import type { DragEvent } from "react";
import { Edit2 } from "lucide-react";
import type { Scene } from "@/types/scene-weaver";

const STATUS_BADGE: Record<Scene["status"], { label: string; className: string }> = {
  idle: { label: "Ready", className: "bg-gray-700 text-gray-300" },
  generating: { label: "Generating…", className: "bg-yellow-500/20 text-yellow-300" },
  done: { label: "Done", className: "bg-green-500/20 text-green-400" },
  error: { label: "Error", className: "bg-red-500/20 text-red-400" },
};

interface SceneCardProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export default function SceneCard({
  scene,
  index,
  isSelected,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: SceneCardProps) {
  const badge = STATUS_BADGE[scene.status];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`w-36 rounded-xl overflow-hidden border cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? "border-purple-500 ring-2 ring-purple-500/40"
          : "border-gray-800 hover:border-gray-600"
      }`}
      role="button"
      aria-label={`Scene ${index + 1}${scene.caption ? `: ${scene.caption}` : ""}`}
      aria-pressed={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative bg-gray-900 aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scene.imageUrl}
          alt={`Scene ${index + 1} thumbnail`}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Scene number */}
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-[10px] font-bold text-white">
          {index + 1}
        </div>

        {/* Edit icon overlay */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-150">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <Edit2 className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Generating spinner overlay */}
        {scene.status === "generating" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div
              className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 px-2 py-2 space-y-1">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.className}`}
        >
          {badge.label}
        </span>

        {scene.caption ? (
          <p className="text-xs text-gray-400 truncate leading-tight">{scene.caption}</p>
        ) : (
          <p className="text-xs text-gray-600 leading-tight">No caption</p>
        )}

        <p className="text-[10px] text-gray-600">{scene.duration}s</p>
      </div>
    </div>
  );
}
