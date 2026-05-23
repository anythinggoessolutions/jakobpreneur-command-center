import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { listRecords, createRecord, deleteRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "GodText Hype Clips";

const ALLOWED_TYPES = ["Hype Clip", "Meme"] as const;

type HypeFields = {
  Name?: string;
  "Video URL"?: string;
  "Clip Type"?: string;
  Duration?: number;
  Notes?: string;
};

export async function GET() {
  try {
    const records = await listRecords<HypeFields>(TABLE);
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
    const { name, mediaUrl, clipType, duration, notes } = body as {
      name?: string;
      mediaUrl?: string;
      clipType?: string;
      duration?: number;
      notes?: string;
    };
    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl required" }, { status: 400 });
    }
    const validType = ALLOWED_TYPES.find((t) => t === clipType) || "Hype Clip";
    const record = await createRecord<HypeFields>(TABLE, {
      Name: name || mediaUrl.split("/").pop() || "Untitled",
      "Video URL": mediaUrl,
      "Clip Type": validType,
      ...(typeof duration === "number" ? { Duration: duration } : {}),
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
