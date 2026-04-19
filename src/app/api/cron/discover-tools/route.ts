import { NextRequest, NextResponse } from "next/server";
import { discoverAndPersist } from "@/lib/discover-and-persist";
import { listRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Hard cap on queue size — if we're at or above this, the daily cron does
// nothing (no Anthropic spend) until the user records and drains some.
// Existing queued tools are never touched.
const QUEUE_CAP = 25;

type ToolFields = { Status?: string };

/**
 * GET /api/cron/discover-tools
 *
 * Daily cron. Asks Claude (with web_search) to find new AI tools, then
 * generates a full content bundle for each and writes Tool + Script
 * records to Airtable. Skips tools already in the Tools table.
 *
 * Cost guard: skips entirely if the queue is already at QUEUE_CAP. Otherwise
 * tops up to the cap, requesting at most `count` per run.
 *
 * Auth: Vercel cron header OR Authorization: Bearer ${CRON_SECRET}.
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  const hasValidBearer = secret && auth === `Bearer ${secret}`;
  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Default 5/day per @jakobpreneur cadence. Caller can override via
  // ?count=N (clamped to [2, 5]).
  const url = new URL(req.url);
  const requestedCount = Number(url.searchParams.get("count") || "5");
  const requestCount = Math.max(2, Math.min(5, requestedCount));

  // Count current queued tools and respect the QUEUE_CAP
  let queuedCount = 0;
  try {
    const tools = await listRecords<ToolFields>("Tools");
    queuedCount = tools.filter((r) => r.fields.Status === "queued").length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `queue count failed: ${msg}` }, { status: 500 });
  }

  const slotsAvailable = Math.max(0, QUEUE_CAP - queuedCount);
  if (slotsAvailable === 0) {
    return NextResponse.json({
      skipped: true,
      reason: `queue at cap (${queuedCount}/${QUEUE_CAP}) — no Anthropic spend this run`,
      queuedCount,
      cap: QUEUE_CAP,
    });
  }

  // Discover at most `requestCount`, but never exceed the cap, and respect
  // the lib's own [2, 5] clamp inside DiscoveredToolsSchema. If only 1 slot
  // remains, the lib's min:2 schema would fail — so floor at 2.
  const toDiscover = Math.max(2, Math.min(requestCount, slotsAvailable));

  const result = await discoverAndPersist(toDiscover);
  const status = result.fatal ? 500 : 200;
  return NextResponse.json(
    { ...result, queuedCountBefore: queuedCount, cap: QUEUE_CAP, requested: toDiscover },
    { status },
  );
}
