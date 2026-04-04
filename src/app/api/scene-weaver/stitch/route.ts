import { NextRequest, NextResponse } from "next/server";

type TransitionType = "fade" | "cut" | "dissolve";

interface StitchRequestBody {
  videoUrls: string[];
  captions: string[];
  mood: string;
  transitionType: TransitionType;
}

interface ClipManifestEntry {
  url: string;
  caption: string;
  duration: number;
  startTime: number;
  transitionType: TransitionType;
}

// Default assumed duration per clip in seconds when not determinable server-side
const DEFAULT_CLIP_DURATION = 4;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<StitchRequestBody>;

    const { videoUrls, captions, mood, transitionType } = body;

    if (!Array.isArray(videoUrls) || videoUrls.length < 2 || videoUrls.length > 8) {
      return NextResponse.json(
        { error: "videoUrls must be an array of 2 to 8 items" },
        { status: 400 }
      );
    }

    if (!captions || !mood || !transitionType) {
      return NextResponse.json(
        { error: "All fields are required: videoUrls, captions, mood, transitionType" },
        { status: 400 }
      );
    }

    const validTransitions: TransitionType[] = ["fade", "cut", "dissolve"];
    if (!validTransitions.includes(transitionType)) {
      return NextResponse.json(
        { error: "transitionType must be one of: fade, cut, dissolve" },
        { status: 400 }
      );
    }

    // Verify all video URLs are reachable and build the stitch manifest.
    // Since server-side ffmpeg-wasm is complex, we return a manifest of clips
    // with timing info for client-side stitching.
    const fetchResults = await Promise.allSettled(
      videoUrls.map((url) =>
        fetch(url, { method: "HEAD" }).then((res) => ({
          url,
          ok: res.ok,
          contentType: res.headers.get("content-type") ?? "",
        }))
      )
    );

    const clips: Array<{ url: string; caption: string; duration: number }> = [];
    const stitchManifest: ClipManifestEntry[] = [];
    let cursor = 0;

    for (let i = 0; i < videoUrls.length; i++) {
      const result = fetchResults[i];
      const url = videoUrls[i];
      const caption = captions[i] ?? "";
      const duration = DEFAULT_CLIP_DURATION;

      // If the HEAD request failed we still include the clip; client-side
      // stitching can handle errors per-clip gracefully.
      if (result.status === "rejected") {
        console.warn(`Could not reach video URL at index ${i}: ${url}`);
      }

      clips.push({ url, caption, duration });

      stitchManifest.push({
        url,
        caption,
        duration,
        startTime: cursor,
        transitionType,
      });

      cursor += duration;
    }

    const totalDuration = cursor;

    return NextResponse.json({ clips, stitchManifest, totalDuration, mood });
  } catch (error: unknown) {
    console.error("Stitch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to build stitch manifest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
