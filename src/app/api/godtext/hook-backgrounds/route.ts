import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { listRecords, createRecord, deleteRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "GodText Hook Backgrounds";

type HookBgFields = {
  Name?: string;
  "Video URL"?: string;
  "Duration"?: number;
  "Source"?: string;
  Notes?: string;
};

export async function GET() {
  try {
    const records = await listRecords<HookBgFields>(TABLE);
    records.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
    return NextResponse.json({ records });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, mediaUrl, duration, source, notes } = body as {
      name?: string;
      mediaUrl?: string;
      duration?: number;
      source?: string;
      notes?: string;
    };
    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl required" }, { status: 400 });
    }
    const record = await createRecord<HookBgFields>(TABLE, {
      Name: name || mediaUrl.split("/").pop() || "Untitled",
      "Video URL": mediaUrl,
      ...(typeof duration === "number" ? { Duration: duration } : {}),
      ...(source ? { Source: source } : {}),
      ...(notes ? { Notes: notes } : {}),
    });
    return NextResponse.json({ record });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const url = new URL(req.url).searchParams.get("url");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    if (url) {
      try {
        await del(url);
      } catch {
        // non-fatal — blob may not exist
      }
    }
    await deleteRecord(TABLE, id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
