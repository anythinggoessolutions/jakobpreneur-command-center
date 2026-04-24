import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { findNextAvailableSlot } from "@/lib/scheduler";
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
  "IG Caption"?: string;
  Platform?: string[];
  "Theme Tag"?: string;
};

/**
 * POST /api/carousel/schedule
 * Schedules a carousel to the next available slot in the shared queue
 * (carousels occupy slots alongside videos).
 *
 * Carousels go to Instagram + TikTok only per SKILL_2.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolName, headline, slides, carouselType, toolUrl, igCaption, aspiration } = body;

    if (!toolName || !headline || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: "toolName, headline, and slides are required" },
        { status: 400 }
      );
    }

    // Get occupied slots (both videos AND carousels count) — driven from
    // `Scheduled Time` ISO datetime, NEVER `Scheduled Date` which is
    // date-only and causes every slot on that date to collide.
    const existing = await listRecords<VideoFields>("Videos");
    const occupiedSlots = buildOccupiedSlots(existing);

    const slot = findNextAvailableSlot(occupiedSlots);
    const today = new Date().toISOString().split("T")[0];

    // Pack carousel spec into File Path field as JSON so we can render later
    const carouselSpec = JSON.stringify({
      type: "carousel",
      headline,
      slides,
      carouselType: carouselType || "tool_breakdown",
      toolName,
      toolUrl,
      ...(aspiration ? { aspiration } : {}),
    });

    const record = await createRecord<VideoFields>("Videos", {
      "Tool Name": `[Carousel] ${toolName}`,
      "Recorded Date": today,
      Status: "scheduled",
      "Scheduled Date": slot.date,
      "Scheduled Time": slot.datetime,
      "IG Caption": igCaption || "",
      Platform: ["Instagram", "TikTok"], // Carousels go to IG + TikTok only
      "File Path": carouselSpec,
      "Theme Tag": "carousel",
    });

    return NextResponse.json({
      id: record.id,
      scheduledDate: slot.date,
      scheduledTime: slot.time,
      scheduledDatetime: slot.datetime,
      platforms: ["Instagram", "TikTok"],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
