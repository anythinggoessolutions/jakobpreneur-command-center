/**
 * Compact part numbers so they're sequential right after the highest
 * recorded/published part number — no gaps. Called whenever the queue
 * changes shape (e.g. on reject), so the next-up video always shows the
 * correct series number.
 *
 * IMPORTANT: only Hook B tools get part numbers. Hook A (Curiosity) and
 * Hook C (Bold Claim) videos are standalone and don't speak a "Part N" out
 * loud, so they shouldn't consume series numbers. Hook A/C tools have
 * Part Number set to 0 to make the distinction explicit in Airtable.
 *
 * Recorded/published Hook B part numbers are sacred (they were the actual
 * part number used in a published video) and are never touched. Only
 * queued Hook B tools get renumbered.
 *
 * Hook B scripts contain "Part N" text in their hook + full script, so when
 * we renumber a Hook B tool, we also rewrite the script text to match.
 */

import { listRecords, updateRecord } from "./airtable";

type ToolFields = {
  Name?: string;
  Status?: string;
  "Part Number"?: number;
  "Hook Type"?: string;
};

type ScriptFields = {
  "Tool Name"?: string;
  Hook?: string;
  "Full Script"?: string;
  "Hook Type"?: string;
  Tweets?: string;
};

const SACRED_STATUSES = new Set(["recorded", "published"]);

export interface CompactResult {
  renumbered: number;
  skipped: number;
  scriptsUpdated: number;
}

function isHookB(t: { fields: ToolFields }): boolean {
  return (t.fields["Hook Type"] || "").startsWith("B");
}

export async function compactQueuedPartNumbers(): Promise<CompactResult> {
  const [tools, scripts] = await Promise.all([
    listRecords<ToolFields>("Tools"),
    listRecords<ScriptFields>("Scripts"),
  ]);

  // Only Hook B tools that are recorded/published count toward the series max.
  const sacredMax = tools
    .filter((r) => SACRED_STATUSES.has(r.fields.Status || ""))
    .filter(isHookB)
    .reduce((m, r) => Math.max(m, r.fields["Part Number"] || 0), 0);

  // Index scripts by lowercased Tool Name for in-place hook rewriting
  const scriptsByName = new Map<string, { id: string; fields: ScriptFields }>();
  for (const s of scripts) {
    const n = (s.fields["Tool Name"] || "").trim().toLowerCase();
    if (n) scriptsByName.set(n, { id: s.id, fields: s.fields });
  }

  let renumbered = 0;
  let skipped = 0;
  let scriptsUpdated = 0;

  // 1) Renumber queued Hook B tools sequentially after the sacred max.
  //    Stable sort: preserve current part number order so the queue feels
  //    consistent across compact runs.
  const queuedHookB = tools
    .filter((r) => r.fields.Status === "queued")
    .filter(isHookB)
    .sort(
      (a, b) =>
        (a.fields["Part Number"] || 0) - (b.fields["Part Number"] || 0),
    );

  let nextPart = sacredMax + 1;
  for (const t of queuedHookB) {
    const oldPart = t.fields["Part Number"] || 0;
    if (oldPart === nextPart) {
      skipped++;
      nextPart++;
      continue;
    }

    await updateRecord<ToolFields>("Tools", t.id, { "Part Number": nextPart });
    renumbered++;

    // The part number is embedded in the script text for Hook B tools —
    // rewrite Hook + Full Script + the JSON-encoded Tweets field so all
    // surfaces stay consistent (the repurposed_hook tweet quotes the part).
    const name = (t.fields.Name || "").trim().toLowerCase();
    const script = scriptsByName.get(name);
    if (script) {
      const fields: Partial<ScriptFields> = {};
      if (script.fields.Hook) {
        fields.Hook = rewritePartNumber(script.fields.Hook, oldPart, nextPart);
      }
      if (script.fields["Full Script"]) {
        fields["Full Script"] = rewritePartNumber(
          script.fields["Full Script"],
          oldPart,
          nextPart,
        );
      }
      if (script.fields.Tweets) {
        fields.Tweets = rewritePartNumber(script.fields.Tweets, oldPart, nextPart);
      }
      if (Object.keys(fields).length > 0) {
        await updateRecord<ScriptFields>("Scripts", script.id, fields);
        scriptsUpdated++;
      }
    }
    nextPart++;
  }

  // 2) Wipe Part Number on queued Hook A / Hook C tools — they don't
  //    consume series slots and shouldn't show a confusing number.
  const queuedNonHookB = tools
    .filter((r) => r.fields.Status === "queued")
    .filter((r) => !isHookB(r));
  for (const t of queuedNonHookB) {
    if ((t.fields["Part Number"] || 0) === 0) continue;
    await updateRecord<ToolFields>("Tools", t.id, { "Part Number": 0 });
    renumbered++;
  }

  return { renumbered, skipped, scriptsUpdated };
}

function rewritePartNumber(text: string, oldPart: number, newPart: number): string {
  // Match "Part N" / "part N" where N is the exact old part number, surrounded
  // by word boundaries. Case-insensitive so tweets with lowercase "part 3" get
  // rewritten too. Capture the original casing to preserve it.
  const re = new RegExp(`\\b(P)(art)\\s+${oldPart}\\b`, "gi");
  return text.replace(re, (_m, p, art) => `${p}${art} ${newPart}`);
}
