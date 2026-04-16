import { NextResponse } from "next/server";
import { listRecords, updateRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";

type ConnectionFields = {
  Platform?: string;
  Status?: string;
  "Access Token"?: string;
  "Refresh Token"?: string;
};

export async function POST() {
  try {
    const records = await listRecords<ConnectionFields>("Connections");
    const x = records.find((r) => r.fields.Platform === "X");

    if (!x) {
      return NextResponse.json({ error: "No X connection found" }, { status: 404 });
    }

    await updateRecord<ConnectionFields>("Connections", x.id, {
      Status: "disconnected",
      "Access Token": "",
      "Refresh Token": "",
    });

    return NextResponse.json({ disconnected: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
