/**
 * HuggingFace Inference API — Stable Video Diffusion
 *
 * SVD requires raw binary image bytes (NOT JSON).
 * It returns a raw binary MP4 which we base64-encode for the browser.
 *
 * Correct endpoint: stabilityai/stable-video-diffusion-img2vid-xt-1-1
 * Docs: https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1
 */

// xt-1-1 is the latest, most stable version on HF free inference
const HF_SVD_URL =
  "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid-xt-1-1";

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
