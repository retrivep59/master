import { NextRequest, NextResponse } from "next/server";
import { generateVideoHF } from "@/lib/hf";

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
    const { imageUrl, motionBucketId, fps, numFrames, condAug } = body;

    if (!imageUrl || motionBucketId === undefined || fps === undefined ||
        numFrames === undefined || condAug === undefined) {
      return NextResponse.json(
        { error: "Required fields: imageUrl, motionBucketId, fps, numFrames, condAug" },
        { status: 400 }
      );
    }

    const videoUrl = await generateVideoHF(imageUrl, {
      motionBucketId,
      fps,
      numFrames,
      condAug,
    });

    return NextResponse.json({ videoUrl });
  } catch (error: unknown) {
    console.error("Scene generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate scene";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
