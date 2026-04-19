import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";
import { parseHookType, parseCarouselType } from "@/lib/airtable-mappings";
import type { QueuedTool, Tweet } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ToolFields = {
  Name?: string;
  URL?: string;
  Source?: string;
  Category?: string;
  Status?: string;
  "Part Number"?: number;
  "Hook Type"?: string;
  "Content Type"?: string;
  "Relevance Score"?: number;
  "Recorded Date"?: string;
  "Rejection Reason"?: string;
  "Theme Tag"?: string;
  Description?: string;
};

type ScriptFields = {
  "Tool Name"?: string;
  Hook?: string;
  Bridge?: string;
  Benefit?: string;
  Demo?: string;
  Close?: string;
  "Full Script"?: string;
  "Hook Type"?: string;
  "Estimated Seconds"?: number;
  Tweets?: string;
  "Carousel Headline"?: string;
  "Carousel Slides"?: string;
  "Carousel Type"?: string;
  "Created Date"?: string;
};

type RawTweet = { content?: string; type?: string };

/**
 * GET /api/tools/queue
 *
 * Returns tools whose Status is "queued" (the natural ready-to-record state),
 * each joined with its matching Script record. Returned shape matches
 * `QueuedTool` so the /content page can drop it in as initial state.
 *
 * Tools without a matching Script are skipped — no script means nothing to
 * review yet; rerun script generation or check Airtable.
 */
export async function GET() {
  try {
    const [toolRecords, scriptRecords] = await Promise.all([
      listRecords<ToolFields>("Tools"),
      listRecords<ScriptFields>("Scripts"),
    ]);

    // Index scripts by tool name (latest wins if duplicates)
    const scriptsByTool = new Map<string, ScriptFields>();
    for (const r of scriptRecords) {
      const name = r.fields["Tool Name"] || "";
      if (!name) continue;
      scriptsByTool.set(name.trim().toLowerCase(), r.fields);
    }

    const queue: QueuedTool[] = [];
    for (const r of toolRecords) {
      if (r.fields.Status !== "queued") continue;
      const name = (r.fields.Name || "").trim();
      if (!name) continue;

      const script = scriptsByTool.get(name.toLowerCase());
      if (!script) continue; // skip tools without a script — nothing to render

      const hookType = parseHookType(script["Hook Type"] || r.fields["Hook Type"]);

      let tweets: Tweet[] = [];
      const tweetsField = script.Tweets;
      if (tweetsField) {
        try {
          const parsed: RawTweet[] = JSON.parse(tweetsField);
          if (Array.isArray(parsed)) {
            tweets = parsed
              .filter((t) => t && typeof t.content === "string")
              .map((t) => ({
                toolId: r.id,
                content: t.content as string,
                type: (t.type as Tweet["type"]) || "tool_of_day",
              }));
          }
        } catch {
          // Malformed Tweets JSON — leave empty, UI handles gracefully
        }
      }

      const carouselSlides = (script["Carousel Slides"] || "")
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean);

      const item: QueuedTool = {
        tool: {
          id: r.id,
          name,
          url: r.fields.URL || "",
          source: r.fields.Source || "Unknown",
          category: r.fields.Category || "Uncategorized",
          description: r.fields.Description || "",
          status: "queued",
          partNumber: r.fields["Part Number"] || 0,
          hookType,
          relevanceScore: r.fields["Relevance Score"] || 0,
          rejectionReason: r.fields["Rejection Reason"],
          recordedDate: r.fields["Recorded Date"],
        },
        script: {
          toolId: r.id,
          hookType,
          hook: script.Hook || "",
          bridge: script.Bridge || "",
          benefit: script.Benefit || "",
          demo: script.Demo || "",
          close: "Now you know.",
          fullScript: script["Full Script"] || "",
          estimatedSeconds: script["Estimated Seconds"] || 22,
        },
        tweets,
        carousel: {
          toolId: r.id,
          type: parseCarouselType(script["Carousel Type"]),
          headline: script["Carousel Headline"] || "",
          slides: carouselSlides,
        },
      };
      queue.push(item);
    }

    // Sort by relevance score (high first), then part number (low first)
    queue.sort((a, b) => {
      const score = b.tool.relevanceScore - a.tool.relevanceScore;
      if (score !== 0) return score;
      return a.tool.partNumber - b.tool.partNumber;
    });

    return NextResponse.json({ queue });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, queue: [] }, { status: 500 });
  }
}
