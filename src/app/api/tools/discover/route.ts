import { NextRequest, NextResponse } from "next/server";
import { discoverAndPersist } from "@/lib/discover-and-persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// In-process rate limit. Survives across requests on a warm Lambda; cold
// starts reset it (worst case the user can fire two back-to-back across a
// cold boundary, ~$0.60). Cheap-and-cheerful guard against accidental
// double-clicks and casual abuse.
const MIN_INTERVAL_MS = 60_000;
let lastRunAt = 0;

/**
 * POST /api/tools/discover?count=N
 *
 * On-demand discovery (the "Discover More" button). Same pipeline as the
 * daily cron. Same-origin only — refuses requests without a matching Origin
 * or Referer header. Bounded by a 60s rate limit and a max count of 3.
 */
export async function POST(req: NextRequest) {
  // Same-origin guard: block off-site CSRF / curl probes
  const url = new URL(req.url);
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const expectedHost = url.host;
  const originMatches = origin && new URL(origin).host === expectedHost;
  const refererMatches = referer && new URL(referer).host === expectedHost;
  if (!originMatches && !refererMatches) {
    return NextResponse.json({ error: "same-origin only" }, { status: 403 });
  }

  // Rate limit
  const now = Date.now();
  const sinceLast = now - lastRunAt;
  if (sinceLast < MIN_INTERVAL_MS) {
    const waitMs = MIN_INTERVAL_MS - sinceLast;
    return NextResponse.json(
      { error: `discovery just ran; try again in ${Math.ceil(waitMs / 1000)}s` },
      { status: 429 },
    );
  }
  lastRunAt = now;

  const requested = Number(url.searchParams.get("count") || "3");
  const count = Math.max(2, Math.min(3, requested)); // tighter cap on UI-triggered runs

  const result = await discoverAndPersist(count);
  const status = result.fatal ? 500 : 200;
  return NextResponse.json(result, { status });
}
