/**
 * Shared discovery + persistence pipeline used by both the daily cron
 * (`/api/cron/discover-tools`) and on-demand UI trigger (`/api/tools/discover`).
 */

import { listRecords, createRecord } from "./airtable";
import { discoverNewTools } from "./tool-discovery";
import { generateScriptBundle } from "./script-generator";
import {
  HOOK_TYPE_LABEL,
  CONTENT_TYPE_LABEL,
  CAROUSEL_TYPE_LABEL,
} from "./airtable-mappings";

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
  "Carousel JSON"?: string; // full carousel payload when type === "aspiration" (aspiration field serialized)
  "Created Date"?: string;
};

function aspirationEnabled(): boolean {
  return (process.env.AI_CAROUSEL_ENABLED || "").toLowerCase() === "true";
}

export interface DiscoverPersistResult {
  ranAt: string;
  discovered: number;
  persisted: number;
  failed: number;
  results: Array<{
    name: string;
    url?: string;
    success: boolean;
    toolId?: string;
    scriptId?: string;
    error?: string;
  }>;
  fatal?: string;
}

export async function discoverAndPersist(count: number): Promise<DiscoverPersistResult> {
  const ranAt = new Date().toISOString();
  const out: DiscoverPersistResult = {
    ranAt,
    discovered: 0,
    persisted: 0,
    failed: 0,
    results: [],
  };

  try {
    const existingTools = await listRecords<ToolFields>("Tools");
    const excludeNames = existingTools.map((r) => r.fields.Name || "").filter(Boolean);
    // Only Hook B tools consume series part numbers. Hook A / Hook C tools
    // are standalone and get Part Number = 0.
    const maxHookBPart = existingTools
      .filter((r) => (r.fields["Hook Type"] || "").startsWith("B"))
      .reduce((m, r) => Math.max(m, r.fields["Part Number"] || 0), 0);

    const { tools } = await discoverNewTools({ count, excludeNames });
    out.discovered = tools.length;

    let nextHookBPart = maxHookBPart + 1;
    const today = ranAt.split("T")[0];

    for (const tool of tools) {
      try {
        const dup = excludeNames.find(
          (n) => n.trim().toLowerCase() === tool.name.trim().toLowerCase(),
        );
        if (dup) {
          out.results.push({
            name: tool.name,
            url: tool.url,
            success: false,
            error: `duplicate of existing tool '${dup}'`,
          });
          continue;
        }

        // Pre-reserve a Hook B part number based on the suggested type
        // (script-generator honors the requested hookType).
        const willBeHookB = tool.suggestedHookType === "B";
        const partNumber = willBeHookB ? nextHookBPart++ : 0;

        const bundle = await generateScriptBundle({
          toolName: tool.name,
          toolUrl: tool.url,
          partNumber,
          hookType: tool.suggestedHookType,
          contentType: tool.contentType,
          reason: tool.reasonInteresting,
          aspirationEnabled: aspirationEnabled(),
        });

        // Safety net: if Claude returned a different hook type than
        // requested, the pre-reserved part number is wrong. Roll it back.
        const actualIsHookB = bundle.hookType === "B";
        const finalPartNumber = actualIsHookB ? partNumber : 0;
        if (willBeHookB && !actualIsHookB) {
          nextHookBPart--; // give the slot back
        }

        const toolRec = await createRecord<ToolFields>("Tools", {
          Name: tool.name,
          URL: tool.url,
          Source: "Auto-discovered",
          Category: bundle.category || tool.category,
          Status: "queued",
          "Part Number": finalPartNumber,
          "Hook Type": HOOK_TYPE_LABEL[bundle.hookType],
          "Content Type": CONTENT_TYPE_LABEL[bundle.contentType],
          "Relevance Score": tool.relevanceScore,
          Description: bundle.description,
        });

        const scriptRec = await createRecord<ScriptFields>("Scripts", {
          "Tool Name": tool.name,
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
          "Carousel JSON":
            bundle.carousel.type === "aspiration" && bundle.carousel.aspiration
              ? JSON.stringify(bundle.carousel.aspiration)
              : undefined,
          "Created Date": today,
        });

        excludeNames.push(tool.name);
        out.persisted++;
        out.results.push({
          name: tool.name,
          url: tool.url,
          success: true,
          toolId: toolRec.id,
          scriptId: scriptRec.id,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        out.failed++;
        out.results.push({
          name: tool.name,
          url: tool.url,
          success: false,
          error: msg.slice(0, 500),
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    out.fatal = msg;
  }

  // Always compact at the end of a discovery run. Discovery reserves part
  // numbers optimistically but new tools may have higher relevance scores
  // than existing queued ones; compact re-sequences everything by queue
  // display order so Part N always matches record-order.
  if (out.persisted > 0) {
    try {
      const { compactQueuedPartNumbers } = await import("./part-numbers");
      await compactQueuedPartNumbers();
    } catch (err) {
      console.error("post-discovery compact failed:", err);
    }
  }

  return out;
}
