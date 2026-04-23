import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { findNextAvailableSlot, PLATFORMS_PER_VIDEO } from "@/lib/scheduler";
import { buildOccupiedSlots } from "@/lib/occupied-slots";

export const dynamic = "force-dynamic";

type VideoFields = {
  "Tool Name"?: string;
  "Part Number"?: number;
  "Recorded Date"?: string;
  "File Path"?: string;
  Status?: string;
  "Scheduled Date"?: string;
  "Scheduled Time"?: string;
  Platform?: string[];
  Views?: number;
  "Theme Tag"?: string;
  "Posted ID"?: string;
  "Posted URL"?: string;
  "Posted At"?: string;
  Error?: string;
};

/**
 * GET /api/schedule
 * Returns all scheduled videos from Airtable.
 */
export async function GET() {
  try {
    const records = await listRecords<VideoFields>("Videos");
    const allVideos = records.map((r) => ({
      id: r.id,
      toolName: r.fields["Tool Name"] || "",
      partNumber: r.fields["Part Number"] || 0,
      recordedDate: r.fields["Recorded Date"] || "",
      status: r.fields.Status || "",
      scheduledDate: r.fields["Scheduled Date"] || "",
      scheduledTime: r.fields["Scheduled Time"] || "",
      platforms: r.fields.Platform || [],
      views: r.fields.Views || 0,
      themeTag: r.fields["Theme Tag"] || "",
      postedUrl: r.fields["Posted URL"] || "",
      postedAt: r.fields["Posted At"] || "",
      error: r.fields.Error || "",
    }));

    // Hide `posted` rows older than 24h — the queue should focus on what's
    // upcoming and what needs attention (scheduled, partial, failed always
    // stay visible). Rows without a Posted At fall back to Scheduled Time.
    // Also hide date-only stub rows (Scheduled Date but no Scheduled Time):
    // cron fires on Scheduled Time, so a row without one never posts and
    // is just clutter from the initial "Schedule" click before publish.
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ONE_DAY_MS;
    const videos = allVideos.filter((v) => {
      if (v.status === "posted") {
        const postedTs = v.postedAt ? Date.parse(v.postedAt) : v.scheduledTime ? Date.parse(v.scheduledTime) : 0;
        return postedTs >= cutoff;
      }
      if (v.status === "scheduled" && !v.scheduledTime) return false;
      return true;
    });

    // Sort by scheduled datetime (prefer ISO Scheduled Time), fall back to date
    videos.sort((a, b) => {
      const aKey = a.scheduledTime || a.scheduledDate;
      const bKey = b.scheduledTime || b.scheduledDate;
      return aKey.localeCompare(bKey);
    });

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

    // Get all existing scheduled videos to find occupied slots — drive
    // from `Scheduled Time` ISO datetime (see lib/occupied-slots).
    const existing = await listRecords<VideoFields>("Videos");
    const occupiedSlots = buildOccupiedSlots(existing);

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
