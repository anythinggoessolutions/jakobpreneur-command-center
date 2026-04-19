import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TweetFields = {
  Text?: string;
  Type?: string;
  "Scheduled Time"?: string;
  Status?: string;
  "Posted At"?: string;
  "Tweet ID"?: string;
  "Tweet URL"?: string;
  Error?: string;
  "Source Job ID"?: string;
};

/**
 * GET /api/tweets/list
 *
 * Returns the next ~10 scheduled tweets (ordered by Scheduled Time asc)
 * and the most recent ~10 posted tweets (by Posted At desc). Used by the
 * Tweets section of the Publishing page.
 */
export async function GET() {
  try {
    const records = await listRecords<TweetFields>("Tweets");
    const mapped = records.map((r) => ({
      id: r.id,
      text: r.fields.Text || "",
      type: r.fields.Type || "",
      status: r.fields.Status || "",
      scheduledTime: r.fields["Scheduled Time"] || "",
      postedAt: r.fields["Posted At"] || "",
      tweetUrl: r.fields["Tweet URL"] || "",
      error: r.fields.Error || "",
    }));

    const scheduled = mapped
      .filter((t) => t.status === "scheduled")
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      .slice(0, 10);

    // Only surface posted tweets from the last 24h — keeps the timeline
    // focused on upcoming + recent, not a growing history.
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ONE_DAY_MS;
    const posted = mapped
      .filter((t) => t.status === "posted" && t.postedAt && Date.parse(t.postedAt) >= cutoff)
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
      .slice(0, 10);

    const failed = mapped
      .filter((t) => t.status === "failed")
      .sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime))
      .slice(0, 5);

    return NextResponse.json({ scheduled, posted, failed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, scheduled: [], posted: [], failed: [] }, { status: 500 });
  }
}
