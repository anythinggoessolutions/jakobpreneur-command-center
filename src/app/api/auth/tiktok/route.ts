import { NextRequest, NextResponse } from "next/server";
import { buildTikTokAuthUrl, getTikTokRedirectUri } from "@/lib/tiktok-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const redirectUri = getTikTokRedirectUri(req.url);
    const authUrl = buildTikTokAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
