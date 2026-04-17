import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { findNextAvailableSlot } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

type VideoFields = {
  "Tool Name"?: string;
  "Part Number"?: number;
  "Recorded Date"?: string;
  "File Path"?: string;
  Status?: string;
  "Scheduled Date"?: string;
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
    const { toolName, headline, slides, carouselType, toolUrl } = body;

    if (!toolName || !headline || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: "toolName, headline, and slides are required" },
        { status: 400 }
      );
    }

    // Get occupied slots (both videos AND carousels count)
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

    // Pack carousel spec into File Path field as JSON so we can render later
    const carouselSpec = JSON.stringify({
      type: "carousel",
      headline,
      slides,
      carouselType: carouselType || "tool_breakdown",
      toolName,
      toolUrl,
    });

    const record = await createRecord<VideoFields>("Videos", {
      "Tool Name": `[Carousel] ${toolName}`,
      "Recorded Date": today,
      Status: "scheduled",
      "Scheduled Date": slot.date,
      Platform: ["Instagram", "TikTok"], // Carousels go to IG + TikTok only
      "File Path": carouselSpec,
      "Theme Tag": "carousel",
    });

    return NextResponse.json({
      id: record.id,
      scheduledDate: slot.date,
      scheduledTime: slot.time,
      platforms: ["Instagram", "TikTok"],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
