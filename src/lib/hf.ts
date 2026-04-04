/**
 * Shared Hugging Face Inference API helper for Stable Video Diffusion.
 *
 * HF SVD returns a raw binary MP4 blob — we convert it to a base64
 * data URL so the frontend can use it directly in <video src="...">.
 *
 * Setup: add HUGGINGFACE_API_TOKEN=hf_... to .env.local and restart server.
 */

const HF_API_URL =
  "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt";

export interface SVDParams {
  motionBucketId?: number;
  fps?: number;
  numFrames?: number;
  condAug?: number;
}

/**
 * Calls HF Inference API with an image URL or base64 data URL.
 * Returns a base64 data URL of the generated MP4 video.
 */
export async function generateVideoHF(
  imageUrl: string,
  params: SVDParams = {}
): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    throw new Error(
      "HUGGINGFACE_API_TOKEN is not set. Add it to .env.local and restart the dev server with: npm run dev"
    );
  }

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Wait-For-Model": "true",
    },
    body: JSON.stringify({
      inputs: imageUrl,
      parameters: {
        motion_bucket_id: params.motionBucketId ?? 127,
        fps: params.fps ?? 6,
        num_frames: params.numFrames ?? 14,
        noise_aug_strength: params.condAug ?? 0.02,
      },
    }),
  });

  if (!response.ok) {
    let errMsg = `HuggingFace API error ${response.status}`;
    try {
      const errBody = (await response.json()) as { error?: string };
      if (errBody.error) errMsg = errBody.error;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errMsg);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:video/mp4;base64,${base64}`;
}
