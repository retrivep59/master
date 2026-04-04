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
      strength,
      guidanceScale,
      numInferenceSteps,
    } = body;

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: "Image URL and prompt are required" },
        { status: 400 }
      );
    }

    // Using SDXL img2img for NSFW image editing/enhancing
    const output = await replicate.run(
      "lucataco/sdxl-img2img:a18b3dae73e8543da87a7edaa0e18e0e0d0a72c3b2dab3e1d6d15f8e8c9fbef6",
      {
        input: {
          image: imageUrl,
          prompt,
          negative_prompt:
            negativePrompt || "low quality, blurry, distorted, ugly",
          strength: strength || 0.7,
          guidance_scale: guidanceScale || 7.5,
          num_inference_steps: numInferenceSteps || 30,
        },
      }
    );

    return NextResponse.json({ output });
  } catch (error: unknown) {
    console.error("img2img error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
