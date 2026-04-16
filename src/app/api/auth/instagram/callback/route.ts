import { NextRequest, NextResponse } from "next/server";
import { exchangeInstagramCode, fetchInstagramAccount, getInstagramRedirectUri } from "@/lib/instagram-oauth";
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
    const redirectUri = getInstagramRedirectUri(req.url);
    const tokens = await exchangeInstagramCode(code, redirectUri);

    // Fetch Instagram account info
    let username = "Instagram User";
    let profilePicture = "";
    try {
      const ig = await fetchInstagramAccount(tokens.accessToken);
      username = ig.username;
      profilePicture = ig.profilePicture;
    } catch {
      // Continue even if account fetch fails
    }

    const expiryDate = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
    const today = new Date().toISOString().split("T")[0];

    // Save to Airtable
    const existing = await listRecords<ConnectionFields>("Connections");
    const igRecord = existing.find((r) => r.fields.Platform === "Instagram");

    const fields: ConnectionFields = {
      Platform: "Instagram",
      "Access Token": tokens.accessToken,
      "Refresh Token": "",
      "Token Expiry": expiryDate,
      "Connected Date": today,
      Status: "connected",
      "Channel Name": username,
      "Channel Thumbnail": profilePicture,
    };

    if (igRecord) {
      await updateRecord<ConnectionFields>("Connections", igRecord.id, fields);
    } else {
      await createRecord<ConnectionFields>("Connections", fields);
    }

    return NextResponse.redirect(`${baseUrl}/publishing?connected=instagram`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Instagram OAuth callback error:", msg);
    return NextResponse.redirect(`${baseUrl}/publishing?error=${encodeURIComponent(msg)}`);
  }
}
