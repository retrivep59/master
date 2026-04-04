/**
 * HuggingFace Inference API — Stable Video Diffusion + InstructPix2Pix
 *
 * Pipeline:
 *   1. (optional) If user provides a prompt → instruct-pix2pix modifies the image
 *   2. SVD animates the (possibly modified) image → raw MP4 → base64 data URL
 *
 * SVD requires raw binary image bytes (NOT JSON).
 * InstructPix2Pix accepts JSON with base64-encoded image.
 */

const HF_BASE = "https://api-inference.huggingface.co/models";

// xt-1-1 is the latest stable SVD on HF free inference
const HF_SVD_URL = `${HF_BASE}/stabilityai/stable-video-diffusion-img2vid-xt-1-1`;

// InstructPix2Pix — text-guided image editing before animation
const HF_IP2P_URL = `${HF_BASE}/timbrooks/instruct-pix2pix`;

export interface SVDParams {
  motionBucketId?: number;
  fps?: number;
  numFrames?: number;
  condAug?: number;
}

/**
 * Convert a data URL (data:image/...;base64,...) or remote URL
 * into a raw Buffer of image bytes, ready to POST to HF.
 */
async function toImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("data:")) {
    // Strip the data URL header and decode base64
    const base64 = imageUrl.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    return Buffer.from(base64, "base64");
  }
  // Remote URL — fetch the raw bytes
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Apply a text prompt to an image using InstructPix2Pix before animation.
 * Returns the modified image as a data URL, or the original if the model fails.
 */
export async function applyPromptToImage(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) throw new Error("HUGGINGFACE_API_TOKEN not set");

  const imageBuffer = await toImageBuffer(imageUrl);
  const base64Image = imageBuffer.toString("base64");

  const response = await fetch(HF_IP2P_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Wait-For-Model": "true",
      "X-Use-Cache": "false",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        image: base64Image,
        num_inference_steps: 20,
        image_guidance_scale: 1.5,
        guidance_scale: 7.5,
      },
    }),
  });

  if (!response.ok) {
    // Fall back to original image — don't block video generation
    console.warn(`InstructPix2Pix failed (${response.status}), using original image`);
    return imageUrl;
  }

  // Response is raw image bytes (JPEG/PNG)
  const imgBuffer = Buffer.from(await response.arrayBuffer());
  if (imgBuffer.length < 500) {
    console.warn("InstructPix2Pix returned empty image, using original");
    return imageUrl;
  }

  return `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
}

/**
 * Animate an image using Stable Video Diffusion on HF Inference API.
 * Sends raw image bytes → receives raw MP4 bytes → returns base64 data URL.
 */
export async function generateVideoHF(
  imageUrl: string,
  params: SVDParams = {}
): Promise<string> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) {
    throw new Error(
      "HUGGINGFACE_API_TOKEN is missing — add it to .env.local and restart with: npm run dev"
    );
  }

  const imageBuffer = await toImageBuffer(imageUrl);

  // HF SVD accepts raw binary image bytes — NOT JSON
  const response = await fetch(HF_SVD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-Wait-For-Model": "true",      // wait for cold start instead of 503
      "X-Use-Cache": "false",          // always generate fresh
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!response.ok) {
    let errMsg = `HF API ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string; estimated_time?: number };
      if (body.error) errMsg = body.error;
      if (body.estimated_time) errMsg += ` — model loading, try again in ${Math.ceil(body.estimated_time)}s`;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const mp4Buffer = Buffer.from(await response.arrayBuffer());
  if (mp4Buffer.length < 1000) {
    throw new Error("HF returned an empty video — the model may be overloaded, please retry");
  }

  return `data:video/mp4;base64,${mp4Buffer.toString("base64")}`;
}
