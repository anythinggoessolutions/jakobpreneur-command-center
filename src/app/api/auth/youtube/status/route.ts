import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";

type ConnectionFields = {
  Platform?: string;
  Status?: string;
  "Channel Name"?: string;
  "Channel Thumbnail"?: string;
  "Connected Date"?: string;
  "Token Expiry"?: string;
};

/**
 * GET /api/auth/youtube/status
 * Returns YouTube connection status.
 */
export async function GET() {
  try {
    const records = await listRecords<ConnectionFields>("Connections");
    const yt = records.find((r) => r.fields.Platform === "YouTube" && r.fields.Status === "connected");

    if (!yt) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      channelName: yt.fields["Channel Name"] || "",
      channelThumbnail: yt.fields["Channel Thumbnail"] || "",
      connectedDate: yt.fields["Connected Date"] || "",
      tokenExpiry: yt.fields["Token Expiry"] || "",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
