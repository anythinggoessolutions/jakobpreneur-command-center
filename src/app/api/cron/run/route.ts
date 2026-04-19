import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/cron/run
 *
 * Manually triggers the fire-due cron. The "Fire due now" button in the
 * Publishing UI hits this — it reads CRON_SECRET server-side and calls
 * /api/cron/fire-due with the bearer token so it passes that route's
 * auth check. Skips the per-user auth because this app is single-tenant.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  // Build an absolute URL to /api/cron/fire-due on the same host
  const origin = new URL(req.url).origin;
  try {
    const res = await fetch(`${origin}/api/cron/fire-due`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
