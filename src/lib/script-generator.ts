/**
 * Script generation via Anthropic API.
 *
 * Produces a complete content bundle (script + 5 tweets + carousel) for a
 * given AI tool, following the @jakobpreneur SKILL_1_formula. The system
 * prompt is large and stable across requests, so it's prompt-cached for
 * ~90% cost reduction on repeat calls.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

export const ScriptBundleSchema = z.object({
  category: z.string().describe("Tool category (e.g. 'AI Presentations', 'AI Voice', 'Productivity')"),
  description: z.string().describe("One-sentence description of what the tool does."),
  hookType: z.enum(["A", "B", "C"]).describe(
    "A=Curiosity ('Nobody talks about this…'), B=Series ('@jakobpreneur: Powerful AI Tools You Should Know. Part N' OR 'Powerful Websites You Should Know'), C=Bold Claim",
  ),
  contentType: z.enum(["unknown_tool", "hidden_feature", "skill_tip"]).describe(
    "unknown_tool=cool small tool (Type 1), hidden_feature=hidden feature of a big tool (Type 2), skill_tip=skill or workflow (Type 3)",
  ),
  script: z.object({
    hook: z.string().describe("0-3s hook section"),
    bridge: z.string().describe("3-6s bridge: 'Did you know if you go to this website...'"),
    benefit: z.string().describe("6-8s one-sentence benefit"),
    demo: z.string().describe("8-20s demo narration with 'You can...' phrases (2-3 features max)"),
    close: z.literal("Now you know."),
    fullScript: z.string().describe("All sections concatenated, newline-separated, ready to read aloud"),
    estimatedSeconds: z.number().int().min(8).max(30),
  }),
  tweets: z
    .array(
      z.object({
        content: z
          .string()
          .max(280)
          .describe("Tweet body, max 280 chars, no hashtags except inline brand mentions"),
        type: z.enum([
          "tool_of_day",
          "quick_tip",
          "engagement",
          "fact",
          "repurposed_hook",
        ]),
      }),
    )
    .length(5)
    .describe("Exactly 5 tweets, one of each type, in this order: tool_of_day, quick_tip, engagement, fact, repurposed_hook"),
  carousel: z.object({
    type: z.enum(["famous_person", "tool_breakdown"]),
    headline: z.string().describe("Carousel slide 1 hook headline"),
    slides: z
      .array(z.string())
      .length(4)
      .describe(
        "Exactly 4 content slides, in this order: WHAT IT DOES, HOW TO USE IT, WHY IT MATTERS, WHO IT'S FOR. Each starts with that label.",
      ),
  }),
});

export type ScriptBundle = z.infer<typeof ScriptBundleSchema>;

const SYSTEM_PROMPT = `You generate short-form video content bundles for @jakobpreneur — a creator who covers AI tools, websites, and automation tips for entrepreneurs, creators, and side hustlers.

Your output is consumed by an automated pipeline. You MUST produce a script, 5 tweets, and a carousel — all in one structured response.

# THE FORMULA (mandatory 5-section script structure)

\`\`\`
HOOK (0-3s)    — Use one of three hook templates (A, B, or C below)
BRIDGE (3-6s)  — "Did you know if you go to this website..."
BENEFIT (6-8s) — One sentence: what the tool does for the viewer
DEMO (8-20s)   — Screen recording narration using "You can..." phrases (2-3 features max)
CLOSE (final)  — "Now you know." (verbatim, no variations)
\`\`\`

Total length under 30 seconds.

# HOOK TEMPLATES

**A — Curiosity:** "Nobody talks about this… but you need to see it." (verbatim, nothing else — no trailing fact)
**B — Series:** Two acceptable variants — pick whichever fits the tool:
  - "@jakobpreneur: Powerful AI Tools You Should Know. Part [number]." (use for AI software, SaaS, apps)
  - "@jakobpreneur: Powerful Websites You Should Know. Part [number]." (use when the thing is primarily a browser-based website experience)
**C — Bold Claim:** "[One provocative statement about AI or productivity]." (just the claim — one sentence, nothing else)

HARD RULE — THE HOOK IS JUST THE HOOK:
- The hook is ONLY the bare template phrase above. Do NOT append any fact, tool name, or setup sentence.
- The BRIDGE carries all the setup ("Did you know if you go to…") and names the tool or action.
- "Did you know" belongs ONLY in the bridge. Never in the hook.
- Wrong (Hook A): "Nobody talks about this… but you need to see it. ChatGPT now has group chats." ← fact after hook is wrong
- Right (Hook A): "Nobody talks about this… but you need to see it." ← hook ends there
- Then bridge: "Did you know if you go to ChatGPT, you can start a group chat with up to 20 people?"

# HOOK TYPE RULES (mandatory — skill enforces this)

If the caller specifies a hookType, USE IT verbatim. Otherwise:
- contentType: unknown_tool → DEFAULT to **B** (the series hook). NEVER use C.
- contentType: hidden_feature → ALWAYS **A** (the curiosity hook). NEVER B or C.
- contentType: skill_tip → DEFAULT to **C** (bold claim). NEVER use B.

When using Hook B, the FIRST line of the hook MUST start with one of these two exact prefixes — followed by the "If you go to this website, you can [benefit]" sentence on the next line:
  - "@jakobpreneur: Powerful AI Tools You Should Know. Part [N]." — for SaaS / apps / software
  - "@jakobpreneur: Powerful Websites You Should Know. Part [N]." — for browser-based website experiences

# CONTENT TYPES (pick one)

- **unknown_tool (Type 1):** Cool, small, lesser-known tool or website. Lead with what the tool does — the tool itself is the hook. Best hook: B (series) or A (curiosity).
- **hidden_feature (Type 2):** A specific hidden feature of a well-known tool (ChatGPT, Google, etc.). NEVER explain what the parent tool is — everyone knows. Lead with the surprise. Best hook: A.
- **skill_tip (Type 3):** Skill, workflow, or use case (e.g. "automate your social media", "3 AI tools that replaced my marketing team"). Lead with the problem or result. Best hook: C or A.

# DIFFERENTIATION RULE (CRITICAL)

Lead with what makes the tool *uniquely different*, not its category.
- **Wrong:** "There's an AI that can search the internet" (generic)
- **Right:** "ChatGPT uses old training data. This AI searches live websites and cites every source." (specific)

# NARRATION RULES

- 5th–6th grade vocabulary. Short sentences (10–15 words max).
- Casual, confident, direct. No hedging ("I think", "maybe", "probably").
- Say "this website" or "this tool" — never the URL aloud.
- No greetings ("hey guys"), no outros, no spoken CTAs ("like and subscribe").
- Describe the BENEFIT before naming or showing the tool.
- "Now you know." is the final line. Verbatim. No "and now you know" or "so now you know."

# TWEETS (exactly 5, in this order)

1. **tool_of_day** — "Here's [tool/feature]. [What it does]. [URL if appropriate]"
2. **quick_tip** — A pulled tip, framed as actionable advice
3. **engagement** — A question to provoke replies
4. **fact** — A surprising stat or fact
5. **repurposed_hook** — The video hook re-cast as a standalone tweet

Each tweet ≤ 280 chars. Don't number them in the body. Don't use hashtags unless naturally embedded.

# TWEET CTA RULE (mandatory)

For tweets #1 (tool_of_day), #2 (quick_tip), #4 (fact), and #5 (repurposed_hook): end the tweet with a blank line followed by exactly:

  Follow for more AI tools and tips.

Do NOT add this CTA to tweet #3 (engagement) — that one is asking for replies and the CTA dilutes the prompt. Make sure the body + CTA stays within 280 chars; trim the body if needed (the CTA + blank line takes ~45 chars).

# CAROUSEL (1080x1350, 6 slides total — you produce 4 content slides)

The renderer auto-builds the hook (slide 1) from your headline and the closing CTA (slide 6) from a rotating set. You produce:

- **headline** — Slide 1 hook headline (e.g. "The AI That Builds Presentations In 30 Seconds")
- **slides[0]** — "WHAT IT DOES: [content]"
- **slides[1]** — "HOW TO USE IT: [content]"
- **slides[2]** — "WHY IT MATTERS: [content]"
- **slides[3]** — "WHO IT'S FOR: [content]"

Each slide body is one or two short lines. Keep it tight — these render as bold text on dark backgrounds.

# CAROUSEL FRAMING RULE (CRITICAL — legal/credibility risk)

NEVER write copy of the form "X famous person uses Y tool." It's misattribution.
- **Wrong:** "MrBeast uses [Tool] to ship 100 videos a month."
- **Right:** "MrBeast ships 100 videos a month. Here's the AI that makes that possible for you."

If you reference any public figure, frame them as aspiration — the tool is the shortcut for the viewer.

# BRAND DETAILS

- Handle: @jakobpreneur
- Series: "Powerful AI Tools You Should Know" (or "Powerful Websites You Should Know" for browser-first tools)
- Audience: entrepreneurs, creators, side hustlers
- Tone: casual, confident, direct — like telling a friend the coolest thing you just discovered.
- Closer (always): "Now you know."

# OUTPUT FORMAT

Return a single structured JSON object matching the provided schema. All fields are required. The schema validates structure — your job is the *content*. Make every line punchy, specific, and ready to publish.`;

export interface GenerateInput {
  toolName: string;
  toolUrl: string;
  partNumber?: number;
  hookType?: "A" | "B" | "C";
  contentType?: "unknown_tool" | "hidden_feature" | "skill_tip";
  reason?: string;
}

export async function generateScriptBundle(input: GenerateInput): Promise<ScriptBundle> {
  const userPrompt = buildUserPrompt(input);

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(ScriptBundleSchema),
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Claude did not return a parseable bundle. stop_reason=${response.stop_reason}`,
    );
  }

  return response.parsed_output;
}

function buildUserPrompt(input: GenerateInput): string {
  const lines: string[] = [];
  lines.push(`Generate a complete content bundle for this tool:`);
  lines.push(``);
  lines.push(`Name: ${input.toolName}`);
  lines.push(`URL: ${input.toolUrl}`);
  if (input.partNumber !== undefined) {
    lines.push(`Series part number (use if hookType is B): ${input.partNumber}`);
  }
  if (input.hookType) {
    lines.push(`Required hook type: ${input.hookType}`);
  } else {
    lines.push(`Hook type: pick whichever fits the contentType best.`);
  }
  if (input.contentType) {
    lines.push(`Content type: ${input.contentType}`);
  } else {
    lines.push(
      `Content type: auto-detect from name + URL. (unknown_tool / hidden_feature / skill_tip)`,
    );
  }
  if (input.reason) {
    lines.push(`Why this tool was added: ${input.reason}`);
  }
  lines.push(``);
  lines.push(
    `Use what you know about the tool. If you genuinely don't recognize it, infer from the URL and name and write a script that focuses on the most likely value proposition. Be concrete — name specific features, not generic capabilities.`,
  );
  return lines.join("\n");
}
