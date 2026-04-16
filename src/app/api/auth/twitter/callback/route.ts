import { NextRequest, NextResponse } from "next/server";
import { exchangeTwitterCode, fetchTwitterUser, getTwitterRedirectUri, getPKCEVerifier } from "@/lib/twitter-oauth";
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
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=missing_code_or_state`);
  }

  const codeVerifier = getPKCEVerifier(state);
  if (!codeVerifier) {
    return NextResponse.redirect(`${baseUrl}/publishing?error=invalid_state`);
  }

  try {
    const redirectUri = getTwitterRedirectUri(req.url);
    const tokens = await exchangeTwitterCode(code, redirectUri, codeVerifier);

    // Fetch user info
    let username = "X User";
    let profileImage = "";
    try {
      const user = await fetchTwitterUser(tokens.accessToken);
      username = `@${user.username}`;
      profileImage = user.profileImage;
    } catch {
      // Continue even if user fetch fails
    }

    const expiryDate = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    const today = new Date().toISOString().split("T")[0];

    // Save to Airtable
    const existing = await listRecords<ConnectionFields>("Connections");
    const xRecord = existing.find((r) => r.fields.Platform === "X");

    const fields: ConnectionFields = {
      Platform: "X",
      "Access Token": tokens.accessToken,
      "Refresh Token": tokens.refreshToken || "",
      "Token Expiry": expiryDate,
      "Connected Date": today,
      Status: "connected",
      "Channel Name": username,
      "Channel Thumbnail": profileImage,
    };

    if (xRecord) {
      await updateRecord<ConnectionFields>("Connections", xRecord.id, fields);
    } else {
      await createRecord<ConnectionFields>("Connections", fields);
    }

    return NextResponse.redirect(`${baseUrl}/publishing?connected=x`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Twitter OAuth callback error:", msg);
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(msg)}`);
  }
}
