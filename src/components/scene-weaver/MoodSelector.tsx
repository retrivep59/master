"use client";

import type { StoryMood } from "@/types/scene-weaver";

interface MoodSelectorProps {
  mood: StoryMood;
  onMoodChange: (mood: StoryMood) => void;
}

const MOODS: Array<{
  value: StoryMood;
  label: string;
  emoji: string;
  color: string;
  activeClass: string;
}> = [
  {
    value: "romantic",
    label: "Romantic",
    emoji: "🌹",
    color: "#f43f5e",
    activeClass: "bg-rose-500/20 border-rose-500 text-rose-300",
  },
  {
    value: "dominant",
    label: "Dominant",
    emoji: "⛓️",
    color: "#7f1d1d",
    activeClass: "bg-red-900/40 border-red-700 text-red-300",
  },
  {
    value: "playful",
    label: "Playful",
    emoji: "✨",
    color: "#7c3aed",
    activeClass: "bg-violet-500/20 border-violet-500 text-violet-300",
  },
  {
    value: "fantasy",
    label: "Fantasy",
    emoji: "🔮",
    color: "#6d28d9",
    activeClass: "bg-purple-500/20 border-purple-500 text-purple-300",
  },
  {
    value: "intense",
    label: "Intense",
    emoji: "🔥",
    color: "#ea580c",
    activeClass: "bg-orange-500/20 border-orange-500 text-orange-300",
  },
];

export default function MoodSelector({ mood, onMoodChange }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2" role="group" aria-label="Story mood">
      {MOODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onMoodChange(m.value)}
          aria-pressed={mood === m.value}
          className={`flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 active:scale-95 ${
            mood === m.value
              ? m.activeClass
              : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200"
          }`}
        >
          <span aria-hidden="true">{m.emoji}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
