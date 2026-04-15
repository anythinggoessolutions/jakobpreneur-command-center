import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, getRedirectUri } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/youtube
 * Redirects the user to Google's OAuth consent screen.
 */
export async function GET(req: NextRequest) {
  try {
    const redirectUri = getRedirectUri(req.url);
    const authUrl = buildAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
