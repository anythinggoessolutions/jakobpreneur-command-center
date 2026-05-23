import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { listRecords, createRecord, deleteRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "GodText Rizz Vault";

type RizzFields = {
  Name?: string;
  "Image URL"?: string;
  Source?: string;
  Notes?: string;
};

/**
 * GET  → list all rizz-vault entries (newest first)
 * POST → persist a vault entry. Body: { name, imageUrl, source?, notes? }
 *        The browser is expected to have already uploaded the bytes to
 *        Vercel Blob via /api/godtext/blob/upload and is just registering
 *        the URL here.
 * DELETE → ?id=<recordId>. Deletes the Airtable row AND the Blob object.
 */
export async function GET() {
  try {
    const records = await listRecords<RizzFields>(TABLE);
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
    const { name, imageUrl, source, notes } = body as {
      name?: string;
      imageUrl?: string;
      source?: string;
      notes?: string;
    };
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }
    const record = await createRecord<RizzFields>(TABLE, {
      Name: name || imageUrl.split("/").pop() || "Untitled",
      "Image URL": imageUrl,
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
    // Best-effort blob cleanup. The Airtable row is the source of truth —
    // if blob deletion fails (already gone, network blip) we still drop
    // the record so the UI stays consistent.
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
