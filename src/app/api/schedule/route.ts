import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { findNextAvailableSlot, PLATFORMS_PER_VIDEO } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

type VideoFields = {
  "Tool Name"?: string;
  "Part Number"?: number;
  "Recorded Date"?: string;
  "File Path"?: string;
  Status?: string;
  "Scheduled Date"?: string;
  Platform?: string[];
  Views?: number;
  "Theme Tag"?: string;
};

/**
 * GET /api/schedule
 * Returns all scheduled videos from Airtable.
 */
export async function GET() {
  try {
    const records = await listRecords<VideoFields>("Videos");
    const videos = records.map((r) => ({
      id: r.id,
      toolName: r.fields["Tool Name"] || "",
      partNumber: r.fields["Part Number"] || 0,
      recordedDate: r.fields["Recorded Date"] || "",
      status: r.fields.Status || "",
      scheduledDate: r.fields["Scheduled Date"] || "",
      platforms: r.fields.Platform || [],
      views: r.fields.Views || 0,
      themeTag: r.fields["Theme Tag"] || "",
    }));

    // Sort by scheduled date
    videos.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    return NextResponse.json({ videos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/schedule
 * Schedule a new video. Finds the next available slot automatically.
 * Body: { toolName, partNumber, themeTag? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolName, partNumber, themeTag } = body;

    if (!toolName) {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    // Get all existing scheduled videos to find occupied slots
    const existing = await listRecords<VideoFields>("Videos");
    const occupiedSlots = existing
      .filter((r) => r.fields.Status && r.fields.Status !== "failed")
      .map((r) => {
        const date = r.fields["Scheduled Date"] || "";
        if (!date) return "";
        // Extract date and time from ISO string
        const d = new Date(date);
        const estHour = d.getUTCHours() - 5; // rough EST
        const dateStr = date.split("T")[0];
        const timeStr = `${String(estHour >= 0 ? estHour : estHour + 24).padStart(2, "0")}:00`;
        return `${dateStr}_${timeStr}`;
      })
      .filter(Boolean);

    // Find next available slot
    const slot = findNextAvailableSlot(occupiedSlots);
    const today = new Date().toISOString().split("T")[0];

    // Create the video record in Airtable
    const record = await createRecord<VideoFields>("Videos", {
      "Tool Name": toolName,
      "Part Number": partNumber || 0,
      "Recorded Date": today,
      Status: "scheduled",
      "Scheduled Date": slot.date,
      Platform: [...PLATFORMS_PER_VIDEO],
      "Theme Tag": themeTag || "",
    });

    return NextResponse.json({
      id: record.id,
      scheduledDate: slot.date,
      scheduledTime: slot.time,
      platforms: slot.platforms,
      slotIndex: slot.slotIndex,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
