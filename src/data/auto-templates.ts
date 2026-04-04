// Auto-pick templates for Single Image Story mode.
// Each entry has a distinct motion profile so the final video
// feels like a real multi-scene production from one photo.

export interface AutoTemplate {
  id: string;
  label: string;
  description: string;
  emoji: string;
  motionBucketId: number;
  fps: number;
  numFrames: number;
  condAug: number;
  decodeChunkSize: number;
}

export const AUTO_TEMPLATES: AutoTemplate[] = [
  {
    id: "soft-intro",
    label: "Soft Intro",
    description: "Gentle breath — the calm opening shot",
    emoji: "🌬️",
    motionBucketId: 25,
    fps: 6,
    numFrames: 14,
    condAug: 0.01,
    decodeChunkSize: 14,
  },
  {
    id: "sensual-sway",
    label: "Sensual Sway",
    description: "Hypnotic side sway — the build-up",
    emoji: "🌊",
    motionBucketId: 85,
    fps: 7,
    numFrames: 18,
    condAug: 0.03,
    decodeChunkSize: 14,
  },
  {
    id: "body-roll",
    label: "Body Roll",
    description: "Fluid rolling wave — the peak",
    emoji: "💃",
    motionBucketId: 160,
    fps: 10,
    numFrames: 20,
    condAug: 0.05,
    decodeChunkSize: 14,
  },
  {
    id: "candleflicker",
    label: "Candlelight",
    description: "Warm light plays across skin — the mood shift",
    emoji: "🕯️",
    motionBucketId: 50,
    fps: 8,
    numFrames: 16,
    condAug: 0.04,
    decodeChunkSize: 14,
  },
  {
    id: "neon-finale",
    label: "Neon Finale",
    description: "Pulsing electric energy — the closing scene",
    emoji: "⚡",
    motionBucketId: 95,
    fps: 10,
    numFrames: 18,
    condAug: 0.06,
    decodeChunkSize: 14,
  },
];
