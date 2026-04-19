import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { findNextAvailableSlot } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VideoFields = {
  "Tool Name"?: string;
  "Part Number"?: number;
  "Recorded Date"?: string;
  "File Path"?: string;
  Status?: string;
  "Scheduled Date"?: string;
  "Scheduled Time"?: string;
  "IG Caption"?: string;
  Platform?: string[];
  "Theme Tag"?: string;
};

/**
 * POST /api/videos/schedule
 *
 * Schedules a face-cam video for publishing at the next open 9am/1pm/7pm EDT slot.
 * The Mac pipeline uploads the processed MP4 to Vercel Blob and calls this with
 * the blob URL + per-platform metadata. The Vercel cron (/api/cron/fire-due) then
 * publishes at slot time.
 *
 * Body: {
 *   toolName, partNumber?, blobUrl,
 *   ytTitle, ytDescription,
 *   igCaption,
 *   platforms: ("YouTube" | "Instagram")[],
 *   sourceJobId?
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      toolName,
      partNumber,
      blobUrl,
      ytTitle,
      ytDescription,
      igCaption,
      platforms,
      sourceJobId,
    } = body as {
      toolName?: string;
      partNumber?: number;
      blobUrl?: string;
      ytTitle?: string;
      ytDescription?: string;
      igCaption?: string;
      platforms?: string[];
      sourceJobId?: string;
    };

    if (!toolName || !blobUrl || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "toolName, blobUrl, and non-empty platforms required" },
        { status: 400 },
      );
    }

    // Occupied slots across all scheduled videos + carousels (they share slots)
    const existing = await listRecords<VideoFields>("Videos");
    const occupiedSlots = existing
      .filter((r) => r.fields.Status && r.fields.Status !== "failed")
      .map((r) => {
        const date = r.fields["Scheduled Date"] || "";
        if (!date) return "";
        const d = new Date(date);
        const estHour = d.getUTCHours() - 5;
        const dateStr = date.split("T")[0];
        const timeStr = `${String(estHour >= 0 ? estHour : estHour + 24).padStart(2, "0")}:00`;
        return `${dateStr}_${timeStr}`;
      })
      .filter(Boolean);

    const slot = findNextAvailableSlot(occupiedSlots);
    const today = new Date().toISOString().split("T")[0];

    const spec = {
      type: "video",
      blobUrl,
      ytTitle: ytTitle || toolName,
      ytDescription: ytDescription || "",
      platforms,
      sourceJobId: sourceJobId || "",
    };

    const record = await createRecord<VideoFields>("Videos", {
      "Tool Name": toolName,
      "Part Number": partNumber || 0,
      "Recorded Date": today,
      Status: "scheduled",
      "Scheduled Date": slot.date,
      "Scheduled Time": slot.datetime,
      "IG Caption": igCaption || "",
      Platform: platforms,
      "File Path": JSON.stringify(spec),
      "Theme Tag": "video",
    });

    return NextResponse.json({
      id: record.id,
      scheduledDate: slot.date,
      scheduledTime: slot.time,
      scheduledDatetime: slot.datetime,
      platforms,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
