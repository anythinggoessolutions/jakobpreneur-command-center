import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord } from "@/lib/airtable";
import { generateGodTextConversation } from "@/lib/godtext-script-generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// One conversation ~ 30-60s with thinking enabled. Batch of 10 → 600s cap
// is enough; Pro tier allows 800s. Default 5/run is a realistic daily
// cadence per the brief.
export const maxDuration = 800;

const RIZZ_TABLE = "GodText Rizz Vault";
const SCRIPTS_TABLE = "GodText Scripts";

type RizzFields = { "Image URL"?: string };

type ScriptFields = {
  Name?: string;
  Status?: string;
  Scenario?: string;
  Platform?: string;
  "Hook Text"?: string;
  "Conversation JSON"?: string;
  "Reference Count"?: number;
};

/**
 * POST /api/godtext/scripts/generate
 *
 * Body: { count?: number (1-10, default 1), scenarioHint?, platformHint? }
 *
 * Generates N scripts using the Rizz Vault as visual reference. Each
 * generated script is persisted to the GodText Scripts table with
 * Status=draft so Phase B's video pipeline can pull from it later.
 *
 * The vault is sampled fresh per script — reference images shuffle each
 * iteration so 5 batched scripts get 5 different stylistic angles instead
 * of 5 near-copies.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedCount = Number(body.count ?? 1);
    const count = Math.max(1, Math.min(10, Number.isFinite(requestedCount) ? requestedCount : 1));
    const { scenarioHint, platformHint } = body as {
      scenarioHint?: string;
      platformHint?: string;
    };

    // Fetch rizz vault images + existing scripts in parallel
    const [rizzRecords, scriptRecords] = await Promise.all([
      listRecords<RizzFields>(RIZZ_TABLE),
      listRecords<ScriptFields>(SCRIPTS_TABLE),
    ]);

    const allImageUrls = rizzRecords
      .map((r) => r.fields["Image URL"])
      .filter((u): u is string => typeof u === "string" && u.length > 0);

    // Extract recently-used woman names + platform counts from existing scripts
    // so we avoid repeats across separate Generate clicks.
    const recentNames: string[] = [];
    const ALL_PLATFORMS = ["Hinge", "Instagram", "Tinder", "iMessage"] as const;
    const platformCounts: Record<string, number> = {
      Hinge: 0, Instagram: 0, Tinder: 0, iMessage: 0,
    };
    for (const rec of scriptRecords) {
      const json = rec.fields["Conversation JSON"];
      if (!json) continue;
      try {
        const conv = JSON.parse(json) as { womanName?: string; platform?: string };
        if (conv.womanName) recentNames.push(conv.womanName);
        if (conv.platform && conv.platform in platformCounts) {
          platformCounts[conv.platform]++;
        }
      } catch {
        // skip unparseable
      }
    }
    // Keep the last 15 names to avoid repeats without overwhelming the prompt.
    const usedNames = [...new Set(recentNames)].slice(-15);

    // Round-robin platform selection: sort by count (least-used first),
    // then pick the next one in rotation for each script in the batch.
    const platformQueue = [...ALL_PLATFORMS].sort(
      (a, b) => platformCounts[a] - platformCounts[b],
    );
    let platformQueueIdx = 0;

    // Generate sequentially so a transient API blip on one doesn't blow
    // away the whole batch (failures are per-iteration). Each iteration
    // gets its own fresh shuffle of up to 6 reference images.
    const results: {
      success: boolean;
      recordId?: string;
      conversation?: unknown;
      error?: string;
    }[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const shuffled = [...allImageUrls].sort(() => Math.random() - 0.5).slice(0, 6);

        // Pick the next platform from the round-robin queue (least-used first)
        const nextPlatform = platformQueue[platformQueueIdx % platformQueue.length];
        platformQueueIdx++;

        const conversation = await generateGodTextConversation(shuffled, {
          scenarioHint,
          platformHint: platformHint || nextPlatform,
          excludeNames: usedNames.length > 0 ? usedNames : undefined,
        });

        // Persist the script for Phase B + the UI's "Generated Scripts" list.
        const record = await createRecord<ScriptFields>(SCRIPTS_TABLE, {
          Name: `${conversation.platform} — ${conversation.scenario}`.slice(0, 100),
          Status: "draft",
          Scenario: conversation.scenario,
          Platform: conversation.platform,
          "Hook Text": conversation.hookText,
          "Conversation JSON": JSON.stringify(conversation),
          "Reference Count": shuffled.length,
        });

        results.push({ success: true, recordId: record.id, conversation });
        // Track name so the next iteration avoids it
        if (conversation.womanName) usedNames.push(conversation.womanName);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ success: false, error: msg });
      }
    }

    return NextResponse.json({
      count,
      referenceVaultSize: allImageUrls.length,
      results,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
