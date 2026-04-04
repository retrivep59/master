/**
 * API Test Script — ImageMotion AI
 *
 * Tests the HuggingFace SVD integration end-to-end.
 * Run with: node test-api.mjs
 *
 * Requires:
 *   - HUGGINGFACE_API_TOKEN in .env.local  (already configured)
 *   - npm run dev running on localhost:3000
 *   - test-input.jpg in the project root
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:3000";

// ── Helpers ────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`\n[TEST] ${msg}`);
const ok  = (msg) => console.log(`  ✅  ${msg}`);
const err = (msg) => console.log(`  ❌  ${msg}`);

async function uploadTestImage() {
  log("Uploading test-input.jpg via /api/upload ...");
  const imageBytes = readFileSync(resolve(__dirname, "test-input.jpg"));
  const blob = new Blob([imageBytes], { type: "image/jpeg" });
  const form = new FormData();
  form.append("file", blob, "test-input.jpg");

  const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", body: form });
  const data = await res.json();

  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  ok(`Uploaded — got ${data.url.length} char data URL`);
  return data.url;
}

async function testMainGenerate(imageUrl) {
  log("Testing /api/generate (main generator) ...");
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      motionBucketId: 80,
      fps: 6,
      numFrames: 14,
      condAug: 0.02,
      decodeChunkSize: 14,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.output) throw new Error(data.error ?? "Generation failed");

  // Save output video
  const b64 = data.output.split(",")[1];
  const buf = Buffer.from(b64, "base64");
  const outPath = resolve(__dirname, "test-output-main.mp4");
  writeFileSync(outPath, buf);
  ok(`Video generated — ${(buf.length / 1024).toFixed(1)} KB saved to test-output-main.mp4`);
  return data.output;
}

async function testSceneGenerate(imageUrl) {
  log("Testing /api/scene-weaver/generate-scene ...");
  const res = await fetch(`${BASE_URL}/api/scene-weaver/generate-scene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      motionBucketId: 127,
      fps: 8,
      numFrames: 14,
      condAug: 0.03,
      decodeChunkSize: 14,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.videoUrl) throw new Error(data.error ?? "Scene generation failed");

  const b64 = data.videoUrl.split(",")[1];
  const buf = Buffer.from(b64, "base64");
  const outPath = resolve(__dirname, "test-output-scene.mp4");
  writeFileSync(outPath, buf);
  ok(`Scene video generated — ${(buf.length / 1024).toFixed(1)} KB saved to test-output-scene.mp4`);
}

async function testSingleImageStory(imageUrl) {
  log("Testing /api/scene-weaver/single-image-story (2 templates) ...");
  const res = await fetch(`${BASE_URL}/api/scene-weaver/single-image-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      customTemplates: [
        { id: "t1", label: "Soft", motionBucketId: 30, fps: 6, numFrames: 12, condAug: 0.01 },
        { id: "t2", label: "Bold", motionBucketId: 140, fps: 8, numFrames: 14, condAug: 0.05 },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.clips) throw new Error(data.error ?? "Story generation failed");

  ok(`Story generated — ${data.successCount}/${data.total} clips successful`);
  data.clips.forEach((clip, i) => {
    if (clip.videoUrl) {
      const b64 = clip.videoUrl.split(",")[1];
      const buf = Buffer.from(b64, "base64");
      const outPath = resolve(__dirname, `test-output-story-${i + 1}.mp4`);
      writeFileSync(outPath, buf);
      ok(`  Clip ${i + 1} (${clip.label}) — ${(buf.length / 1024).toFixed(1)} KB → test-output-story-${i + 1}.mp4`);
    } else {
      err(`  Clip ${i + 1} (${clip.label}) failed: ${clip.error}`);
    }
  });
}

// ── Run all tests ──────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════");
console.log("  ImageMotion AI — API Test Suite");
console.log("  Target: " + BASE_URL);
console.log("═══════════════════════════════════════");

try {
  const imageUrl = await uploadTestImage();
  await testMainGenerate(imageUrl);
  await testSceneGenerate(imageUrl);
  await testSingleImageStory(imageUrl);

  console.log("\n═══════════════════════════════════════");
  console.log("  ✅  All tests passed!");
  console.log("  Output files: test-output-*.mp4");
  console.log("═══════════════════════════════════════\n");
} catch (e) {
  console.log("\n═══════════════════════════════════════");
  console.log("  ❌  Test failed:", e.message);
  console.log("═══════════════════════════════════════\n");
  process.exit(1);
}
