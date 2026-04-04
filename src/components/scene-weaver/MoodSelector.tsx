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
  activeStyle: React.CSSProperties;
}> = [
  { value: "romantic", label: "Romantic", emoji: "🌹", activeStyle: { background: "rgba(192,0,106,0.2)", border: "1px solid #c0006a", color: "#ff69b4" } },
  { value: "dominant", label: "Dominant", emoji: "⛓️", activeStyle: { background: "rgba(100,0,0,0.35)", border: "1px solid #8b0000", color: "#ff6060" } },
  { value: "playful",  label: "Playful",  emoji: "✨", activeStyle: { background: "rgba(122,0,192,0.2)", border: "1px solid #7a00c0", color: "#c084fc" } },
  { value: "fantasy",  label: "Fantasy",  emoji: "🔮", activeStyle: { background: "rgba(80,0,160,0.2)",  border: "1px solid #6b21a8", color: "#a78bfa" } },
  { value: "intense",  label: "Intense",  emoji: "🔥", activeStyle: { background: "rgba(180,50,0,0.2)",  border: "1px solid #c2410c", color: "#fb923c" } },
];

const IDLE_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(192,0,106,0.15)",
  color: "#7a4a7a",
};

export default function MoodSelector({ mood, onMoodChange }: MoodSelectorProps) {
  return (
    <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2" role="group" aria-label="Story mood">
      {MOODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onMoodChange(m.value)}
          aria-pressed={mood === m.value}
          className="flex items-center justify-center gap-1.5 px-3 py-3 sm:py-2.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
          style={mood === m.value ? m.activeStyle : IDLE_STYLE}
        >
          <span aria-hidden="true">{m.emoji}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
