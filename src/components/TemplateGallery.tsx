"use client";

import { useState } from "react";
import { Flame, Check } from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES, Template } from "@/data/templates";
import type { VideoSettingsValues } from "./VideoSettings";

interface TemplateGalleryProps {
  onSelect: (settings: VideoSettingsValues, templateName: string) => void;
  activeTemplateId: string | null;
}

export default function TemplateGallery({
  onSelect,
  activeTemplateId,
}: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered =
    activeCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  const handleSelect = (template: Template) => {
    onSelect(template.settings, template.id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            Motion Templates
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            {TEMPLATES.length} ready-to-use presets — click to apply
          </p>
        </div>
        {activeTemplateId && (
          <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
            Template active
          </span>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            {cat}
            {cat !== "All" && (
              <span className="ml-1.5 text-xs opacity-60">
                {TEMPLATES.filter((t) => t.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
        {filtered.map((template) => {
          const isActive = activeTemplateId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={`relative text-left p-3 rounded-xl border transition-all duration-150 group ${
                isActive
                  ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-900/20"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800"
              }`}
            >
              {/* Hot badge */}
              {template.hot && (
                <span className="absolute top-2 right-2 flex items-center gap-0.5 text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                  <Flame className="w-2.5 h-2.5" />
                  Hot
                </span>
              )}

              {/* Active check */}
              {isActive && (
                <span className="absolute top-2 right-2 bg-purple-500 rounded-full p-0.5">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}

              <div className="text-2xl mb-2 leading-none">{template.emoji}</div>
              <p className="text-white text-xs font-semibold leading-tight mb-1">
                {template.name}
              </p>
              <p className="text-gray-500 text-[11px] leading-tight line-clamp-2">
                {template.description}
              </p>

              {/* Settings preview */}
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded">
                  M:{template.settings.motionBucketId}
                </span>
                <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded">
                  {template.settings.fps}fps
                </span>
                <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded">
                  {template.settings.numFrames}f
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs">
        Templates auto-configure motion intensity, FPS, and frame count. You can fine-tune in Advanced Settings.
      </p>
    </div>
  );
}
