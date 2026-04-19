import { NextResponse } from "next/server";
import { listRecords, updateRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/videos/[id]/retry
 *
 * Resets a failed or partial Videos row back to `scheduled` so the next
 * /api/cron/fire-due tick re-attempts the failed platforms. For partial
 * rows this leaves pendingPlatforms intact (only the remaining ones are
 * retried). For failed rows it also resets attemptCount so the row gets
 * the full 3-attempt budget again.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;

    const records = await listRecords<{
      Status?: string;
      "File Path"?: string;
      "Theme Tag"?: string;
    }>("Videos");
    const rec = records.find((r) => r.id === id);
    if (!rec) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      Status: "scheduled",
      Error: "",
    };

    // For video rows, reset attemptCount inside the spec so retry gets a
    // fresh budget. Leave pendingPlatforms as-is (only retry what's pending).
    if (rec.fields["Theme Tag"] === "video") {
      try {
        const spec = JSON.parse(rec.fields["File Path"] || "{}");
        spec.attemptCount = 0;
        if (!Array.isArray(spec.pendingPlatforms) || spec.pendingPlatforms.length === 0) {
          spec.pendingPlatforms = spec.platforms || [];
        }
        updates["File Path"] = JSON.stringify(spec);
      } catch {
        // Malformed spec — leave File Path untouched
      }
    }

    await updateRecord("Videos", id, updates);
    return NextResponse.json({ id, status: "scheduled" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
