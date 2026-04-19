import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/airtable";
import { compactQueuedPartNumbers } from "@/lib/part-numbers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ToolFields = {
  Status?: string;
  "Rejection Reason"?: string;
  "Recorded Date"?: string;
};

const VALID_STATUSES = new Set(["queued", "recorded", "rejected", "published"]);

/**
 * POST /api/tools/[id]/status
 * Body: { status: "recorded" | "rejected" | "published" | "queued", rejectionReason?: string }
 *
 * Updates the Tool record's status (and optionally rejection reason / recorded date).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const { status, rejectionReason } = body as {
      status?: string;
      rejectionReason?: string;
    };

    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `status must be one of ${[...VALID_STATUSES].join(", ")}` },
        { status: 400 },
      );
    }

    const fields: ToolFields = { Status: status };
    if (status === "rejected" && rejectionReason) {
      fields["Rejection Reason"] = rejectionReason.slice(0, 500);
    }
    if (status === "recorded") {
      fields["Recorded Date"] = new Date().toISOString().split("T")[0];
    }

    const updated = await updateRecord<ToolFields>("Tools", id, fields);

    // After a reject, repack the remaining queued part numbers so the
    // series stays sequential (per user request: "if I choose not this
    // one, the numbers of the videos should be correct").
    let compactSummary = null;
    if (status === "rejected") {
      try {
        compactSummary = await compactQueuedPartNumbers();
      } catch (err) {
        // Non-fatal — status update already succeeded
        console.error("compactQueuedPartNumbers failed:", err);
      }
    }

    return NextResponse.json({ id: updated.id, status, compact: compactSummary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
