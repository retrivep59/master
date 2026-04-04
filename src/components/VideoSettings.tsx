"use client";

import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
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

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  tooltip?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-sm text-gray-300" title={tooltip}>
          {label}
        </label>
        <span className="text-sm font-mono text-purple-400">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-purple-500 h-1.5 rounded-full bg-gray-700 appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-600 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function VideoSettings({ values, onChange }: VideoSettingsProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (key: keyof VideoSettingsValues, val: number) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Settings2 className="w-4 h-4 text-purple-400" />
          Advanced Settings
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="p-4 bg-gray-900/50 space-y-5">
          <SliderField
            label="Motion Intensity"
            value={values.motionBucketId}
            min={1}
            max={255}
            step={1}
            onChange={(v) => update("motionBucketId", v)}
            tooltip="Controls how much motion is applied. Higher = more movement."
          />
          <SliderField
            label="FPS"
            value={values.fps}
            min={1}
            max={30}
            step={1}
            onChange={(v) => update("fps", v)}
            tooltip="Frames per second for the output video."
          />
          <SliderField
            label="Number of Frames"
            value={values.numFrames}
            min={2}
            max={25}
            step={1}
            onChange={(v) => update("numFrames", v)}
            tooltip="Total frames to generate. More frames = longer video."
          />
          <SliderField
            label="Noise Augmentation"
            value={values.condAug}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update("condAug", v)}
            tooltip="Adds noise variation. Lower = closer to original image."
          />
          <SliderField
            label="Decode Chunk Size"
            value={values.decodeChunkSize}
            min={1}
            max={25}
            step={1}
            onChange={(v) => update("decodeChunkSize", v)}
            tooltip="Frames decoded at once. Lower = less VRAM needed."
          />
        </div>
      )}
    </div>
  );
}
