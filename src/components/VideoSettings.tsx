"use client";

import { ChevronDown, ChevronUp, Sliders } from "lucide-react";
import { useState } from "react";

export interface VideoSettingsValues {
  motionBucketId: number;
  fps: number;
  numFrames: number;
  condAug: number;
  decodeChunkSize: number;
}

interface VideoSettingsProps {
  values: VideoSettingsValues;
  onChange: (values: VideoSettingsValues) => void;
}

function SliderField({ label, value, min, max, step, onChange, tooltip }: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; tooltip?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs font-medium" style={{ color: "#9a7a9a" }} title={tooltip}>{label}</label>
        <span className="text-xs font-black" style={{ color: "#c0006a" }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "#c0006a", background: "rgba(192,0,106,0.15)" }}
      />
      <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "#5a3a5a" }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

export default function VideoSettings({ values, onChange }: VideoSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const update = (key: keyof VideoSettingsValues, val: number) => onChange({ ...values, [key]: val });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(192,0,106,0.15)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: "#9a7a9a" }}>
          <Sliders className="w-3.5 h-3.5" style={{ color: "#c0006a" }} />
          Advanced Controls
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: "#c0006a" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "#5a3a5a" }} />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4" style={{ background: "rgba(192,0,106,0.03)" }}>
          <SliderField label="💥 Motion Intensity" value={values.motionBucketId} min={1} max={255} step={1} onChange={(v) => update("motionBucketId", v)} tooltip="Higher = more movement" />
          <SliderField label="🎬 Frame Rate (FPS)" value={values.fps} min={1} max={30} step={1} onChange={(v) => update("fps", v)} />
          <SliderField label="🎞️ Total Frames" value={values.numFrames} min={2} max={25} step={1} onChange={(v) => update("numFrames", v)} />
          <SliderField label="🌡️ Noise Level" value={values.condAug} min={0} max={1} step={0.01} onChange={(v) => update("condAug", v)} />
          <SliderField label="⚙️ Decode Chunk" value={values.decodeChunkSize} min={1} max={25} step={1} onChange={(v) => update("decodeChunkSize", v)} />
        </div>
      )}
    </div>
  );
}
