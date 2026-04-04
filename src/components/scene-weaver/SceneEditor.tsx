"use client";

import { X } from "lucide-react";
import type { Scene } from "@/types/scene-weaver";
import { TEMPLATES } from "@/data/templates";

interface SceneEditorProps {
  scene: Scene;
  onUpdate: (updates: Partial<Scene>) => void;
  onClose: () => void;
}

const DURATIONS: Array<{ value: 2 | 4 | 6; label: string }> = [
  { value: 2, label: "2s" },
  { value: 4, label: "4s" },
  { value: 6, label: "6s" },
];

export default function SceneEditor({ scene, onUpdate, onClose }: SceneEditorProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-white text-sm">Edit Scene</h3>
        <button
          onClick={onClose}
          aria-label="Close editor"
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Thumbnail */}
        {scene.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scene.imageUrl}
              alt="Scene preview"
              className="w-full max-h-48 object-cover"
            />
          </div>
        )}

        {/* Caption */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="scene-caption">
            Caption
          </label>
          <input
            id="scene-caption"
            type="text"
            value={scene.caption}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Optional scene caption..."
            maxLength={80}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <p className="text-[10px] text-gray-600 mt-1">{scene.caption.length}/80</p>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Duration
          </label>
          <div className="flex gap-2">
            {DURATIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onUpdate({ duration: value })}
                aria-pressed={scene.duration === value}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  scene.duration === value
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Template picker */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Motion Template
          </label>
          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            <button
              onClick={() => onUpdate({ templateId: null })}
              aria-pressed={scene.templateId === null}
              className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                scene.templateId === null
                  ? "border-gray-500 bg-gray-700 text-white"
                  : "border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600"
              }`}
            >
              <div className="font-medium">Default</div>
              <div className="text-[10px] opacity-70">No preset</div>
            </button>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdate({ templateId: t.id })}
                aria-pressed={scene.templateId === t.id}
                className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                  scene.templateId === t.id
                    ? "border-pink-500 bg-pink-500/10 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>{t.emoji}</span>
                  <span className="font-medium truncate">{t.name}</span>
                </div>
                <div className="text-[10px] opacity-60 truncate mt-0.5">{t.category}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
