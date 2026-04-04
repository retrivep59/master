import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageUrl,
      prompt,
      negativePrompt,
      motionBucketId,
      fps,
      numFrames,
      condAug,
      decodeChunkSize,
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Using Stable Video Diffusion model via Replicate
    // This model generates video from a single image
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      {
        input: {
          input_image: imageUrl,
          motion_bucket_id: motionBucketId || 127,
          fps_id: fps || 6,
          cond_aug: condAug || 0.02,
          decoding_t: decodeChunkSize || 14,
          video_length: numFrames || 14,
        },
      }
    );

    return NextResponse.json({ output });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
