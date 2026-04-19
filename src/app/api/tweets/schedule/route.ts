import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { nextTweetSlots } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TweetFields = {
  Text?: string;
  "Scheduled Time"?: string;
  Status?: string;
  "Posted At"?: string;
  "Tweet ID"?: string;
  "Tweet URL"?: string;
  Error?: string;
  "Source Job ID"?: string;
};

/**
 * POST /api/tweets/schedule
 * Body: { tweets: string[], sourceJobId?: string }
 *
 * Distributes tweets across the next available daily slots
 * (9am / 12pm / 3pm / 6pm / 9pm EST), one per slot.
 * Skips empty/null tweet strings.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tweets, sourceJobId } = body as { tweets?: unknown; sourceJobId?: string };

    if (!Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json({ error: "tweets array required" }, { status: 400 });
    }

    const cleaned = tweets
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t.length > 0);

    if (cleaned.length === 0) {
      return NextResponse.json({ error: "no non-empty tweets provided" }, { status: 400 });
    }

    // Find what's already scheduled to avoid double-booking a slot
    const existing = await listRecords<TweetFields>("Tweets");
    const occupied = new Set(
      existing
        .filter((r) => r.fields.Status === "scheduled")
        .map((r) => r.fields["Scheduled Time"] || "")
        .filter(Boolean),
    );

    const slots = nextTweetSlots(cleaned.length, occupied);

    const created = [];
    for (let i = 0; i < cleaned.length; i++) {
      const text = cleaned[i].slice(0, 280);
      const slot = slots[i];
      const rec = await createRecord<TweetFields>("Tweets", {
        Text: text,
        "Scheduled Time": slot.datetime,
        Status: "scheduled",
        "Source Job ID": sourceJobId || "",
      });
      created.push({
        id: rec.id,
        text,
        scheduledTime: slot.datetime,
        estLabel: slot.estLabel,
      });
    }

    return NextResponse.json({ scheduled: created.length, tweets: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
