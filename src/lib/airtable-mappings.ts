/**
 * Reverse-mappings between Airtable single-select labels (used in the Tools
 * and Scripts tables) and the short codes the UI/app code uses internally.
 */

export type HookCode = "A" | "B" | "C" | "D" | "E" | "F";

export const HOOK_TYPE_LABEL: Record<HookCode, string> = {
  A: "A - Curiosity",
  B: "B - Series",
  C: "C - Bold Claim",
  D: "D - Insider Secret",
  E: "E - Urgency",
  F: "F - Replace-It",
};

export const CONTENT_TYPE_LABEL: Record<"unknown_tool" | "hidden_feature" | "skill_tip", string> = {
  unknown_tool: "Type 1 - Unknown Tool",
  hidden_feature: "Type 2 - Hidden Feature",
  skill_tip: "Type 3 - Skill/Tip",
};

export const CAROUSEL_TYPE_LABEL: Record<"famous_person" | "tool_breakdown", string> = {
  famous_person: "Famous Person",
  tool_breakdown: "Tool Breakdown",
};

const HOOK_LABEL_TO_CODE: Record<string, HookCode> = {
  "A - Curiosity": "A",
  "B - Series": "B",
  "C - Bold Claim": "C",
  "D - Insider Secret": "D",
  "E - Urgency": "E",
  "F - Replace-It": "F",
};

const CAROUSEL_LABEL_TO_CODE: Record<string, "famous_person" | "tool_breakdown"> = {
  "Famous Person": "famous_person",
  "Tool Breakdown": "tool_breakdown",
};

export function parseHookType(label: string | undefined): HookCode {
  if (!label) return "B";
  return HOOK_LABEL_TO_CODE[label] ?? "B";
}

export function parseCarouselType(label: string | undefined): "famous_person" | "tool_breakdown" {
  if (!label) return "tool_breakdown";
  return CAROUSEL_LABEL_TO_CODE[label] ?? "tool_breakdown";
}
