import { NextRequest, NextResponse } from "next/server";

type JobStatus = "pending" | "done" | "error";

interface JobRecord {
  status: JobStatus;
  videoUrl?: string;
  error?: string;
}

// In-memory stub store — Replicate is synchronous so this acts as a
// placeholder for any async job tracking the frontend might want.
const jobStore = new Map<string, JobRecord>();

// Expose the store so other routes can register jobs if needed.
export { jobStore };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const record = jobStore.get(jobId);

    if (!record) {
      // Unknown job IDs are treated as pending — the client can poll until
      // the generating route registers the completed job.
      return NextResponse.json({ status: "pending" } satisfies { status: JobStatus });
    }

    return NextResponse.json(record);
  } catch (error: unknown) {
    console.error("Status check error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to retrieve job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
