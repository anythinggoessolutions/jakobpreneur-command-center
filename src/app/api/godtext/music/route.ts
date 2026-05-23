import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { listRecords, createRecord, deleteRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "GodText Music";

type MusicFields = {
  Name?: string;
  "Audio URL"?: string;
  Notes?: string;
};

export async function GET() {
  try {
    const records = await listRecords<MusicFields>(TABLE);
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
    const { name, audioUrl, notes } = body as {
      name?: string;
      audioUrl?: string;
      notes?: string;
    };
    if (!audioUrl) {
      return NextResponse.json({ error: "audioUrl required" }, { status: 400 });
    }
    const record = await createRecord<MusicFields>(TABLE, {
      Name: name || audioUrl.split("/").pop() || "Untitled",
      "Audio URL": audioUrl,
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
        // non-fatal
      }
    }
    await deleteRecord(TABLE, id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
