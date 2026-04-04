import { NextRequest, NextResponse } from "next/server";
import { generateVideoHF } from "@/lib/hf";

const AUTO_TEMPLATES = [
  { id: "silk-breathe", label: "Gentle Breathe", motionBucketId: 30,  fps: 6,  numFrames: 14, condAug: 0.01 },
  { id: "slow-sway",    label: "Slow Sway",       motionBucketId: 80,  fps: 7,  numFrames: 18, condAug: 0.03 },
  { id: "body-roll",    label: "Body Roll",        motionBucketId: 160, fps: 10, numFrames: 20, condAug: 0.05 },
  { id: "candlelight",  label: "Candlelight",      motionBucketId: 50,  fps: 8,  numFrames: 16, condAug: 0.04 },
  { id: "neon-pulse",   label: "Neon Pulse",       motionBucketId: 95,  fps: 10, numFrames: 18, condAug: 0.06 },
];

interface CustomTemplate {
  id: string;
  label: string;
  motionBucketId: number;
  fps: number;
  numFrames: number;
  condAug: number;
}

interface SingleImageStoryRequest {
  imageUrl: string;
  customTemplates?: CustomTemplate[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SingleImageStoryRequest>;
    const { imageUrl, customTemplates } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const templates =
      customTemplates && customTemplates.length >= 2 ? customTemplates : AUTO_TEMPLATES;

    if (templates.length < 2) {
      return NextResponse.json(
        { error: "At least 2 templates are required" },
        { status: 400 }
      );
    }

    // Generate all clips in parallel from the same image
    const results = await Promise.allSettled(
      templates.map(async (tpl) => {
        const videoUrl = await generateVideoHF(imageUrl, {
          motionBucketId: tpl.motionBucketId,
          fps: tpl.fps,
          numFrames: tpl.numFrames,
          condAug: tpl.condAug,
        });
        return { id: tpl.id, label: tpl.label, videoUrl };
      })
    );

    const clips = results.map((r, i) => {
      if (r.status === "fulfilled") return { ...r.value, error: null };
      return {
        id: templates[i].id,
        label: templates[i].label,
        videoUrl: null,
        error: r.reason instanceof Error ? r.reason.message : "Generation failed",
      };
    });

    const successCount = clips.filter((c) => c.videoUrl).length;
    if (successCount < 2) {
      return NextResponse.json(
        { error: "Not enough clips generated successfully", clips },
        { status: 500 }
      );
    }

    return NextResponse.json({ clips, successCount, total: clips.length });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Single-image story generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const AUTO_TEMPLATE_LIST = AUTO_TEMPLATES;
