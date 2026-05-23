import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { listRecords, createRecord, deleteRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "GodText UI References";

type UIRefFields = {
  Name?: string;
  Platform?: string;
  "Image URL"?: string;
  Notes?: string;
};

const ALLOWED_PLATFORMS = ["Hinge", "Instagram", "Tinder", "Bumble", "iMessage"] as const;
type Platform = (typeof ALLOWED_PLATFORMS)[number];

export async function GET() {
  try {
    const records = await listRecords<UIRefFields>(TABLE);
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
    const { name, imageUrl, platform, notes } = body as {
      name?: string;
      imageUrl?: string;
      platform?: string;
      notes?: string;
    };
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }
    if (!platform || !ALLOWED_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json(
        { error: `platform required and must be one of ${ALLOWED_PLATFORMS.join(", ")}` },
        { status: 400 },
      );
    }
    const record = await createRecord<UIRefFields>(TABLE, {
      Name: name || imageUrl.split("/").pop() || "Untitled",
      Platform: platform,
      "Image URL": imageUrl,
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
