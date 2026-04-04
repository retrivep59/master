import { NextRequest, NextResponse } from "next/server";
import { generateVideoHF, applyPromptToImage } from "@/lib/hf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, motionBucketId, fps, numFrames, condAug, prompt } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Step 1: If a prompt is provided, modify the image with InstructPix2Pix
    const sourceImage = prompt?.trim()
      ? await applyPromptToImage(imageUrl, prompt.trim())
      : imageUrl;

    // Step 2: Animate with SVD
    const videoDataUrl = await generateVideoHF(sourceImage, {
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
