// Auto-pick templates for Single Image Story mode.
// Each entry has a distinct motion profile so the final video
// feels like a real multi-scene adult production from one photo.

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
    label: "Slow Tease",
    description: "Barely moving — slow reveal that builds tension",
    emoji: "🌬️",
    motionBucketId: 30,
    fps: 7,
    numFrames: 20,
    condAug: 0.02,
    decodeChunkSize: 14,
  },
  {
    id: "sensual-sway",
    label: "Body Sway",
    description: "Hypnotic hip sway — the build-up to the action",
    emoji: "🌊",
    motionBucketId: 100,
    fps: 8,
    numFrames: 22,
    condAug: 0.03,
    decodeChunkSize: 14,
  },
  {
    id: "body-roll",
    label: "Hip Grind",
    description: "Deep grinding motion — peak explicit scene",
    emoji: "💃",
    motionBucketId: 160,
    fps: 10,
    numFrames: 22,
    condAug: 0.05,
    decodeChunkSize: 14,
  },
  {
    id: "candleflicker",
    label: "Naked Glow",
    description: "Warm light plays over bare skin — intimate mood",
    emoji: "🕯️",
    motionBucketId: 55,
    fps: 8,
    numFrames: 20,
    condAug: 0.04,
    decodeChunkSize: 14,
  },
  {
    id: "neon-finale",
    label: "Full Climax",
    description: "High-energy thrusting finale — the money shot",
    emoji: "🔥",
    motionBucketId: 120,
    fps: 10,
    numFrames: 22,
    condAug: 0.06,
    decodeChunkSize: 14,
  },
];
