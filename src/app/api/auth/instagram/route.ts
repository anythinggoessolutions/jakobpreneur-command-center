import { NextRequest, NextResponse } from "next/server";
import { buildInstagramAuthUrl, getInstagramRedirectUri } from "@/lib/instagram-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const redirectUri = getInstagramRedirectUri(req.url);
    const authUrl = buildInstagramAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
