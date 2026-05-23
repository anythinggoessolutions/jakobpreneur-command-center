import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AIRTABLE_API = "https://api.airtable.com/v0";

/**
 * GET /api/godtext/videos/status?jobId=recXXX
 *
 * Returns the current status of a video assembly job.
 * The UI polls this every few seconds after queuing a build.
 *
 * Response: { status, videoUrl?, error? }
 *   status: "queued" | "processing" | "complete" | "failed"
 */
export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json(
        { error: "jobId query param required" },
        { status: 400 },
      );
    }

    const key = process.env.AIRTABLE_API_KEY;
    const base = process.env.AIRTABLE_BASE_ID;
    if (!key || !base) {
      return NextResponse.json(
        { error: "Airtable not configured" },
        { status: 500 },
      );
    }

    const res = await fetch(
      `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Video Jobs")}/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Job not found: ${res.status}` },
        { status: 404 },
      );
    }

    const data = await res.json();
    const fields = data.fields || {};

    return NextResponse.json({
      status: fields.Status || "unknown",
      videoUrl: fields["Video URL"] || null,
      error: fields.Error || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
