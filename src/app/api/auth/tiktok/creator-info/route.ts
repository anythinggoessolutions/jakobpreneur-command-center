import { NextResponse } from "next/server";
import { getValidTikTokToken, queryTikTokCreatorInfo } from "@/lib/tiktok-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/auth/tiktok/creator-info
 *
 * Fetches the connected TikTok creator's posting capabilities for the
 * publish UI. Required by the Content Sharing Guidelines: the privacy
 * dropdown and the comment / duet / stitch toggles must be populated
 * from creator_info, not hardcoded.
 *
 * Response shape mirrors the TikTokCreatorInfo type but in camelCase JSON.
 * On any failure (TikTok not connected, token expired, TikTok API down)
 * returns { error } with status 500 — the caller renders a "couldn't
 * load TikTok options, uncheck TikTok or try again" state.
 */
export async function GET() {
  try {
    const accessToken = await getValidTikTokToken();
    const info = await queryTikTokCreatorInfo(accessToken);
    return NextResponse.json(info);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
