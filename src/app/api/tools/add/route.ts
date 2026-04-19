import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { generateScriptBundle } from "@/lib/script-generator";
import {
  HOOK_TYPE_LABEL,
  CONTENT_TYPE_LABEL,
  CAROUSEL_TYPE_LABEL,
} from "@/lib/airtable-mappings";
import type { QueuedTool, Tweet } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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

/**
 * POST /api/tools/add
 *
 * Manually add a tool. Generates a full content bundle (script + 5 tweets +
 * carousel) via Claude, then writes Tool + Script records to Airtable.
 * Returns the new QueuedTool so the UI can drop it in immediately.
 *
 * Body: { name, url, hookType?, reason? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url, hookType, reason } = body as {
      name?: string;
      url?: string;
      hookType?: "A" | "B" | "C";
      reason?: string;
    };

    if (!name || !url) {
      return NextResponse.json({ error: "name and url required" }, { status: 400 });
    }

    // Compute next part number (max existing + 1)
    const existing = await listRecords<ToolFields>("Tools");
    const partNumber =
      existing.reduce((m, r) => Math.max(m, r.fields["Part Number"] || 0), 0) + 1;

    const bundle = await generateScriptBundle({
      toolName: name,
      toolUrl: url,
      partNumber,
      hookType,
      reason,
    });

    const today = new Date().toISOString().split("T")[0];

    const toolRec = await createRecord<ToolFields>("Tools", {
      Name: name,
      URL: url,
      Source: reason || "Manual submission",
      Category: bundle.category,
      Status: "queued",
      "Part Number": partNumber,
      "Hook Type": HOOK_TYPE_LABEL[bundle.hookType],
      "Content Type": CONTENT_TYPE_LABEL[bundle.contentType],
      "Relevance Score": 99, // manual adds are user-prioritized
      Description: bundle.description,
    });

    await createRecord<ScriptFields>("Scripts", {
      "Tool Name": name,
      Hook: bundle.script.hook,
      Bridge: bundle.script.bridge,
      Benefit: bundle.script.benefit,
      Demo: bundle.script.demo,
      Close: bundle.script.close,
      "Full Script": bundle.script.fullScript,
      "Hook Type": HOOK_TYPE_LABEL[bundle.hookType],
      "Estimated Seconds": bundle.script.estimatedSeconds,
      Tweets: JSON.stringify(bundle.tweets, null, 2),
      "Carousel Headline": bundle.carousel.headline,
      "Carousel Slides": bundle.carousel.slides.join("\n\n"),
      "Carousel Type": CAROUSEL_TYPE_LABEL[bundle.carousel.type],
      "Created Date": today,
    });

    const queuedTool: QueuedTool = {
      tool: {
        id: toolRec.id,
        name,
        url,
        source: reason || "Manual submission",
        category: bundle.category,
        description: bundle.description,
        status: "queued",
        partNumber,
        hookType: bundle.hookType,
        relevanceScore: 99,
      },
      script: {
        toolId: toolRec.id,
        hookType: bundle.hookType,
        hook: bundle.script.hook,
        bridge: bundle.script.bridge,
        benefit: bundle.script.benefit,
        demo: bundle.script.demo,
        close: bundle.script.close,
        fullScript: bundle.script.fullScript,
        estimatedSeconds: bundle.script.estimatedSeconds,
      },
      tweets: bundle.tweets.map(
        (t): Tweet => ({
          toolId: toolRec.id,
          content: t.content,
          type: t.type,
        }),
      ),
      carousel: {
        toolId: toolRec.id,
        type: bundle.carousel.type,
        headline: bundle.carousel.headline,
        slides: bundle.carousel.slides,
      },
    };

    return NextResponse.json(queuedTool);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
