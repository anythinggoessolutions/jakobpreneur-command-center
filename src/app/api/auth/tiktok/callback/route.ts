import { NextRequest, NextResponse } from "next/server";
import { exchangeTikTokCode, fetchTikTokUserInfo, getTikTokRedirectUri } from "@/lib/tiktok-oauth";
import { listRecords, createRecord, updateRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";

type ConnectionFields = {
  Platform?: string;
  "Access Token"?: string;
  "Refresh Token"?: string;
  "Token Expiry"?: string;
  "Connected Date"?: string;
  Status?: string;
  "Channel Name"?: string;
  "Channel Thumbnail"?: string;
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=no_code`);
  }

  try {
    const redirectUri = getTikTokRedirectUri(req.url);
    const tokens = await exchangeTikTokCode(code, redirectUri);

    // Fetch user info
    let displayName = "TikTok User";
    let avatarUrl = "";
    try {
      const user = await fetchTikTokUserInfo(tokens.accessToken);
      displayName = user.displayName;
      avatarUrl = user.avatarUrl;
    } catch {
      // User info is optional — continue even if it fails
    }

    const expiryDate = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    const today = new Date().toISOString().split("T")[0];

    // Save to Airtable
    const existing = await listRecords<ConnectionFields>("Connections");
    const ttRecord = existing.find((r) => r.fields.Platform === "TikTok");

    const fields: ConnectionFields = {
      Platform: "TikTok",
      "Access Token": tokens.accessToken,
      "Refresh Token": tokens.refreshToken,
      "Token Expiry": expiryDate,
      "Connected Date": today,
      Status: "connected",
      "Channel Name": displayName,
      "Channel Thumbnail": avatarUrl,
    };

    if (ttRecord) {
      await updateRecord<ConnectionFields>("Connections", ttRecord.id, fields);
    } else {
      await createRecord<ConnectionFields>("Connections", fields);
    }

    return NextResponse.redirect(`${baseUrl}/publishing?connected=tiktok`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("TikTok OAuth callback error:", msg);
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(msg)}`);
  }
}
