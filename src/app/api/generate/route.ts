import { NextRequest, NextResponse } from "next/server";
import { generateVideoHF } from "@/lib/hf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, motionBucketId, fps, numFrames, condAug } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const videoDataUrl = await generateVideoHF(imageUrl, {
      motionBucketId,
      fps,
      numFrames,
      condAug,
    });

    return NextResponse.json({ output: videoDataUrl });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
