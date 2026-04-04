"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES, type Template } from "@/data/templates";
import type { VideoSettingsValues } from "./VideoSettings";

const CATEGORY_EMOJIS: Record<string, string> = {
  All: "🔥", Striptease: "👗", Lingerie: "🎀", Shower: "🚿",
  Bedroom: "🛏️", Domination: "⛓️", Roleplay: "🎭",
  "Solo Play": "💃", Couples: "💏", Fetish: "✨",
};

const CATEGORY_COLORS: Record<string, string> = {
  All: "#c0006a", Striptease: "#ff2d78", Lingerie: "#e0006a",
  Shower: "#0096c7", Bedroom: "#7a00c0", Domination: "#8b0000",
  Roleplay: "#c07000", "Solo Play": "#c0006a", Couples: "#e0006a", Fetish: "#6a00c0",
};

interface TemplateGalleryProps {
  onSelect: (settings: VideoSettingsValues, templateId: string) => void;
  activeTemplateId: string | null;
}

export default function TemplateGallery({ onSelect, activeTemplateId }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered = activeCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">🎬 Motion Styles</h3>
          <p className="text-xs mt-0.5" style={{ color: "#7a4a7a" }}>
            {TEMPLATES.length} explicit presets — tap to apply
          </p>
        </div>
        {activeTemplateId && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(192,0,106,0.2)", border: "1px solid rgba(192,0,106,0.4)", color: "#ff4da6" }}>
            ✓ Applied
          </span>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          const color = CATEGORY_COLORS[cat] ?? "#c0006a";
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95"
              style={active
                ? { background: color, borderColor: color, color: "white" }
                : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#9a7a9a" }
              }
            >
              <span>{CATEGORY_EMOJIS[cat]}</span>
              {cat}
              {cat !== "All" && (
                <span className="opacity-60 text-[10px]">
                  {TEMPLATES.filter((t) => t.category === cat).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-0.5 scrollbar-none">
        {filtered.map((template) => {
          const isActive = activeTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.settings, template.id)}
              className="relative text-left p-3 rounded-xl transition-all duration-150 active:scale-95"
              style={isActive
                ? { background: "rgba(192,0,106,0.2)", border: "1px solid rgba(192,0,106,0.6)", boxShadow: "0 0 20px rgba(192,0,106,0.2)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
              }
            >
              {template.hot && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-black px-1 py-0.5 rounded-full hot-pulse"
                  style={{ background: "rgba(255,60,0,0.25)", color: "#ff6030", border: "1px solid rgba(255,60,0,0.3)" }}>
                  🔥HOT
                </span>
              )}
              {isActive && (
                <span className="absolute top-1.5 right-1.5 rounded-full p-0.5" style={{ background: "#c0006a" }}>
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}
              <div className="text-xl mb-1.5 leading-none">{template.emoji}</div>
              <p className="text-white text-[11px] font-bold leading-tight mb-0.5">{template.name}</p>
              <p className="text-[10px] leading-tight line-clamp-2" style={{ color: "#7a5a7a" }}>{template.description}</p>
              <div className="mt-2 flex gap-1 flex-wrap">
                <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(192,0,106,0.15)", color: "#c0006a" }}>
                  M:{template.settings.motionBucketId}
                </span>
                <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#9a7a9a" }}>
                  {template.settings.fps}fps
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
