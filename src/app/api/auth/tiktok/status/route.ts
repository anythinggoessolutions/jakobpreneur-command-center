import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";

type ConnectionFields = {
  Platform?: string;
  Status?: string;
  "Channel Name"?: string;
  "Channel Thumbnail"?: string;
  "Connected Date"?: string;
};

export async function GET() {
  try {
    const records = await listRecords<ConnectionFields>("Connections");
    const tt = records.find((r) => r.fields.Platform === "TikTok" && r.fields.Status === "connected");

    if (!tt) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      displayName: tt.fields["Channel Name"] || "",
      avatarUrl: tt.fields["Channel Thumbnail"] || "",
      connectedDate: tt.fields["Connected Date"] || "",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
