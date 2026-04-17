import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

/**
 * POST /api/blob/delete
 * Deletes a blob after Instagram has pulled it.
 * Body: { url: "https://..." }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    await del(url);
    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
