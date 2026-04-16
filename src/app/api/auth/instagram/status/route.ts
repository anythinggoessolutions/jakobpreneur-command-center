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
    const ig = records.find((r) => r.fields.Platform === "Instagram" && r.fields.Status === "connected");

    if (!ig) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      username: ig.fields["Channel Name"] || "",
      profilePicture: ig.fields["Channel Thumbnail"] || "",
      connectedDate: ig.fields["Connected Date"] || "",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
