import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord, updateRecord } from "@/lib/airtable";

export const dynamic = "force-dynamic";

type BackgroundFields = {
  Title?: string;
  "YouTube URL"?: string;
  "Video ID"?: string;
  Category?: string;
  "Thumbnail URL"?: string;
  Duration?: string;
  "Added Date"?: string;
  "Times Used"?: number;
  Status?: string;
};

export async function GET() {
  try {
    const records = await listRecords<BackgroundFields>("Backgrounds");
    const videos = records.map((r) => ({
      id: r.id,
      title: r.fields.Title || "",
      youtubeUrl: r.fields["YouTube URL"] || "",
      videoId: r.fields["Video ID"] || "",
      category: r.fields.Category || "Random",
      thumbnailUrl: r.fields["Thumbnail URL"] || "",
      duration: r.fields.Duration || "",
      addedDate: r.fields["Added Date"] || "",
      timesUsed: r.fields["Times Used"] || 0,
      status: r.fields.Status || "active",
    }));
    return NextResponse.json({ videos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { youtubeUrl, title, category, thumbnailUrl, duration, videoId } = body;

    if (!youtubeUrl || !title) {
      return NextResponse.json({ error: "youtubeUrl and title required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const record = await createRecord<BackgroundFields>("Backgrounds", {
      Title: title,
      "YouTube URL": youtubeUrl,
      "Video ID": videoId || "",
      Category: category || "Random",
      "Thumbnail URL": thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      Duration: duration || "",
      "Added Date": today,
      "Times Used": 0,
      Status: "active",
    });

    return NextResponse.json({ id: record.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, currentTimesUsed, status } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const fields: Partial<BackgroundFields> = {};
    if (action === "increment_used") {
      fields["Times Used"] = (currentTimesUsed || 0) + 1;
    }
    if (status) {
      fields.Status = status;
    }

    const record = await updateRecord<BackgroundFields>("Backgrounds", id, fields);
    return NextResponse.json({ id: record.id, fields: record.fields });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
