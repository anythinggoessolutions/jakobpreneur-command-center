import { NextRequest, NextResponse } from "next/server";
import { buildTwitterAuthUrl, getTwitterRedirectUri } from "@/lib/twitter-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const redirectUri = getTwitterRedirectUri(req.url);
    const authUrl = buildTwitterAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
