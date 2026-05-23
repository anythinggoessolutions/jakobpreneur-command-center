import { NextRequest, NextResponse } from "next/server";
import { createRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JobFields = {
  Status: string;
  "Conversation JSON": string;
  Theme: string;
  "Video URL"?: string;
  Error?: string;
};

/**
 * POST /api/godtext/videos/queue
 *
 * Creates a video assembly job in Airtable. The local video worker
 * running on the Mac picks it up, builds the video with Playwright +
 * FFmpeg, uploads the MP4 to Vercel Blob, and updates the record.
 *
 * Body: { conversation: object, theme?: "dark" | "white" }
 * Returns: { jobId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversation, theme } = body as {
      conversation?: Record<string, unknown>;
      theme?: string;
    };

    if (!conversation) {
      return NextResponse.json(
        { error: "conversation object required" },
        { status: 400 },
      );
    }

    const record = await createRecord<JobFields>("GodText Video Jobs", {
      Status: "queued",
      "Conversation JSON": JSON.stringify(conversation),
      Theme: theme || "dark",
    });

    return NextResponse.json({ jobId: record.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
