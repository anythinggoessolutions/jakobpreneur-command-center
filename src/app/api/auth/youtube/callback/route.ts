import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchChannelInfo, getRedirectUri } from "@/lib/google-oauth";
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

/**
 * GET /api/auth/youtube/callback?code=XXX
 * Google redirects here after user approves.
 * Exchanges the code for tokens, fetches channel info, saves to Airtable.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  // Build the base URL for redirecting back to publishing page
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=no_code`);
  }

  try {
    const redirectUri = getRedirectUri(req.url);

    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // 2. Fetch channel info
    const channel = await fetchChannelInfo(tokens.accessToken);

    // 3. Calculate token expiry timestamp
    const expiryDate = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    const today = new Date().toISOString().split("T")[0];

    // 4. Save to Airtable — update existing YouTube record or create new one
    const existing = await listRecords<ConnectionFields>("Connections");
    const ytRecord = existing.find((r) => r.fields.Platform === "YouTube");

    const fields: ConnectionFields = {
      Platform: "YouTube",
      "Access Token": tokens.accessToken,
      "Refresh Token": tokens.refreshToken || ytRecord?.fields["Refresh Token"] || "",
      "Token Expiry": expiryDate,
      "Connected Date": today,
      Status: "connected",
      "Channel Name": channel.channelName,
      "Channel Thumbnail": channel.channelThumbnail,
    };

    if (ytRecord) {
      await updateRecord<ConnectionFields>("Connections", ytRecord.id, fields);
    } else {
      await createRecord<ConnectionFields>("Connections", fields);
    }

    // 5. Redirect back to publishing page with success
    return NextResponse.redirect(`${baseUrl}/publishing?connected=youtube`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("YouTube OAuth callback error:", msg);
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(msg)}`);
  }
}
