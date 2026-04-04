import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface GenerateSceneRequestBody {
  imageUrl: string;
  motionBucketId: number;
  fps: number;
  numFrames: number;
  condAug: number;
  decodeChunkSize: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<GenerateSceneRequestBody>;

    const { imageUrl, motionBucketId, fps, numFrames, condAug, decodeChunkSize } =
      body;

    if (
      imageUrl === undefined ||
      motionBucketId === undefined ||
      fps === undefined ||
      numFrames === undefined ||
      condAug === undefined ||
      decodeChunkSize === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "All fields are required: imageUrl, motionBucketId, fps, numFrames, condAug, decodeChunkSize",
        },
        { status: 400 }
      );
    }

    // Using Stable Video Diffusion model via Replicate
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      {
        input: {
          input_image: imageUrl,
          motion_bucket_id: motionBucketId,
          fps_id: fps,
          cond_aug: condAug,
          decoding_t: decodeChunkSize,
          video_length: numFrames,
        },
      }
    );

    // Replicate SVD returns an array of file URLs; the video is the first item
    const outputArray = output as string[];
    const videoUrl = Array.isArray(outputArray) ? outputArray[0] : String(output);

    return NextResponse.json({ videoUrl });
  } catch (error: unknown) {
    console.error("Scene generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate scene";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
