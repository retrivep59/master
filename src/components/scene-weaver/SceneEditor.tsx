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
    <div
      className="fixed inset-y-0 right-0 w-80 z-50 flex flex-col shadow-2xl"
      style={{ background: "#0d000d", borderLeft: "1px solid rgba(192,0,106,0.3)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(192,0,106,0.2)" }}>
        <h3 className="font-bold text-sm" style={{ color: "#ff69b4" }}>Edit Scene</h3>
        <button
          onClick={onClose}
          aria-label="Close editor"
          className="transition-colors p-1 rounded-lg"
          style={{ color: "#7a4a7a" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ff69b4"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#7a4a7a"; }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Thumbnail */}
        {scene.imageUrl && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(192,0,106,0.2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scene.imageUrl} alt="Scene preview" className="w-full max-h-48 object-cover" />
          </div>
        )}

        {/* Caption */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9a6a8a" }} htmlFor="scene-caption">
            Caption
          </label>
          <input
            id="scene-caption"
            type="text"
            value={scene.caption}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Optional scene caption…"
            maxLength={80}
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-pink-900 focus:outline-none transition-colors"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(192,0,106,0.25)" }}
            onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(192,0,106,0.7)"; }}
            onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(192,0,106,0.25)"; }}
          />
          <p className="text-[10px] mt-1" style={{ color: "#4a2a4a" }}>{scene.caption.length}/80</p>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9a6a8a" }}>Duration</label>
          <div className="flex gap-2">
            {DURATIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onUpdate({ duration: value })}
                aria-pressed={scene.duration === value}
                className="flex-1 py-2 rounded-lg text-sm font-bold border transition-colors"
                style={scene.duration === value
                  ? { background: "rgba(192,0,106,0.3)", border: "1px solid #c0006a", color: "#ff69b4" }
                  : { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(192,0,106,0.15)", color: "#7a4a7a" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Template picker */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9a6a8a" }}>Motion Template</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            <button
              onClick={() => onUpdate({ templateId: null })}
              aria-pressed={scene.templateId === null}
              className="text-left p-2 rounded-lg border text-xs transition-colors"
              style={scene.templateId === null
                ? { border: "1px solid rgba(192,0,106,0.6)", background: "rgba(192,0,106,0.1)", color: "#ff69b4" }
                : { border: "1px solid rgba(192,0,106,0.15)", background: "rgba(0,0,0,0.3)", color: "#7a4a7a" }}
            >
              <div className="font-bold">Default</div>
              <div className="text-[10px] opacity-70">No preset</div>
            </button>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdate({ templateId: t.id })}
                aria-pressed={scene.templateId === t.id}
                className="text-left p-2 rounded-lg border text-xs transition-colors"
                style={scene.templateId === t.id
                  ? { border: "1px solid #c0006a", background: "rgba(192,0,106,0.15)", color: "#ff69b4" }
                  : { border: "1px solid rgba(192,0,106,0.1)", background: "rgba(0,0,0,0.3)", color: "#7a4a7a" }}
              >
                <div className="flex items-center gap-1">
                  <span>{t.emoji}</span>
                  <span className="font-bold truncate">{t.name}</span>
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
