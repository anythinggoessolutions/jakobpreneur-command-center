/**
 * Part number assignment — numbers are assigned at RECORDING TIME only.
 *
 * Queued Hook B tools have Part Number = 0 (unassigned). When the user
 * marks a tool as "recorded", assignNextPartNumber() gives it the next
 * sequential number after the highest existing recorded/published part.
 *
 * This means the series order matches the order the user actually films,
 * not the order tools appeared in the queue.
 *
 * Hook A/C/D/E/F tools never get part numbers (always 0).
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
  Tweets?: string;
};

function isHookB(t: { fields: ToolFields }): boolean {
  return (t.fields["Hook Type"] || "").startsWith("B");
}

export interface AssignResult {
  toolId: string;
  assignedPart: number;
  scriptUpdated: boolean;
}

/**
 * Assigns the next sequential part number to a specific Hook B tool.
 * Called when status transitions to "recorded". Returns the assigned number.
 */
export async function assignNextPartNumber(toolId: string): Promise<AssignResult> {
  const [tools, scripts] = await Promise.all([
    listRecords<ToolFields>("Tools"),
    listRecords<ScriptFields>("Scripts"),
  ]);

  const target = tools.find((r) => r.id === toolId);
  if (!target) throw new Error(`Tool ${toolId} not found`);
  if (!isHookB(target)) {
    return { toolId, assignedPart: 0, scriptUpdated: false };
  }

  const maxPart = tools
    .filter(isHookB)
    .filter((r) => (r.fields["Part Number"] || 0) > 0)
    .reduce((m, r) => Math.max(m, r.fields["Part Number"] || 0), 0);

  const nextPart = maxPart + 1;

  await updateRecord<ToolFields>("Tools", toolId, { "Part Number": nextPart });

  let scriptUpdated = false;
  const toolName = (target.fields.Name || "").trim().toLowerCase();
  const script = scripts.find(
    (s) => (s.fields["Tool Name"] || "").trim().toLowerCase() === toolName,
  );

  if (script) {
    const fields: Partial<ScriptFields> = {};
    if (script.fields.Hook) {
      fields.Hook = injectPartNumber(script.fields.Hook, nextPart);
    }
    if (script.fields["Full Script"]) {
      fields["Full Script"] = injectPartNumber(script.fields["Full Script"], nextPart);
    }
    if (script.fields.Tweets) {
      fields.Tweets = injectPartNumber(script.fields.Tweets, nextPart);
    }
    if (Object.keys(fields).length > 0) {
      await updateRecord<ScriptFields>("Scripts", script.id, fields);
      scriptUpdated = true;
    }
  }

  return { toolId, assignedPart: nextPart, scriptUpdated };
}

/**
 * Injects or replaces "Part N" in script text.
 * Handles both cases:
 *  - Text already has "Part [TBD]" or "Part \d+" → replace with correct number
 *  - Text has "You Should Know." without Part → append " Part N."
 */
function injectPartNumber(text: string, part: number): string {
  const hasPart = /\bPart\s+(\d+|\[TBD\])/i.test(text);
  if (hasPart) {
    return text.replace(/\b(Part)\s+(\d+|\[TBD\])/gi, `$1 ${part}`);
  }
  return text.replace(
    /(Powerful AI Tools You Should Know)\./gi,
    `$1. Part ${part}.`,
  );
}

/**
 * Legacy compat — called after reject/record status changes.
 * Now a no-op since queued tools no longer have part numbers.
 */
export async function compactQueuedPartNumbers(): Promise<{ renumbered: number; skipped: number; scriptsUpdated: number }> {
  return { renumbered: 0, skipped: 0, scriptsUpdated: 0 };
}
