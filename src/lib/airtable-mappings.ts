/**
 * Reverse-mappings between Airtable single-select labels (used in the Tools
 * and Scripts tables) and the short codes the UI/app code uses internally.
 */

export const HOOK_TYPE_LABEL: Record<"A" | "B" | "C", string> = {
  A: "A - Curiosity",
  B: "B - Series",
  C: "C - Bold Claim",
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

const HOOK_LABEL_TO_CODE: Record<string, "A" | "B" | "C"> = {
  "A - Curiosity": "A",
  "B - Series": "B",
  "C - Bold Claim": "C",
};

const CAROUSEL_LABEL_TO_CODE: Record<string, "famous_person" | "tool_breakdown"> = {
  "Famous Person": "famous_person",
  "Tool Breakdown": "tool_breakdown",
};

export function parseHookType(label: string | undefined): "A" | "B" | "C" {
  if (!label) return "B";
  return HOOK_LABEL_TO_CODE[label] ?? "B";
}

export function parseCarouselType(label: string | undefined): "famous_person" | "tool_breakdown" {
  if (!label) return "tool_breakdown";
  return CAROUSEL_LABEL_TO_CODE[label] ?? "tool_breakdown";
}
