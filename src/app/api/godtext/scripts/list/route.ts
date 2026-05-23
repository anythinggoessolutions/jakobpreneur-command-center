import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLE = "GodText Scripts";

type ScriptFields = {
  Name?: string;
  Status?: string;
  Scenario?: string;
  Platform?: string;
  "Hook Text"?: string;
  "Conversation JSON"?: string;
  "Reference Count"?: number;
};

/**
 * GET /api/godtext/scripts/list
 *
 * Returns all saved GodText scripts from Airtable, newest first.
 */
export async function GET() {
  try {
    const records = await listRecords<ScriptFields>(TABLE);
    records.sort((a, b) => b.createdTime.localeCompare(a.createdTime));

    const scripts = records.map((r) => ({
      id: r.id,
      createdTime: r.createdTime,
      name: r.fields.Name || "Untitled",
      status: r.fields.Status || "draft",
      scenario: r.fields.Scenario || "",
      platform: r.fields.Platform || "",
      hookText: r.fields["Hook Text"] || "",
      conversation: r.fields["Conversation JSON"]
        ? JSON.parse(r.fields["Conversation JSON"])
        : null,
    }));

    return NextResponse.json({ scripts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
