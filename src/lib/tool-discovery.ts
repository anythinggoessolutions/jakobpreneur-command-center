/**
 * Auto-discovery of new AI tools via Claude + web search.
 *
 * Returns 2-5 newly trending or recently launched AI tools that fit
 * the @jakobpreneur content profile. Caller is responsible for
 * persisting them and generating script bundles.
 *
 * Implementation note: combining `output_config.format` (structured outputs)
 * with server-side tools like `web_search` is unreliable — the model
 * produces text/citations before the final response and the parser misses
 * the JSON block. Instead we define a custom tool `submit_discovered_tools`
 * whose input_schema is our payload schema. Claude searches the web with
 * `web_search`, then calls `submit_discovered_tools` exactly once as its
 * last action with the structured payload. We extract `tool_use.input`
 * and validate with Zod.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

export const DiscoveredToolsSchema = z.object({
  tools: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        category: z.string(),
        description: z.string(),
        contentType: z.enum(["unknown_tool", "hidden_feature", "skill_tip"]),
        suggestedHookType: z.enum(["A", "B", "C", "D", "E", "F"]),
        relevanceScore: z.number().int().min(1).max(100),
        reasonInteresting: z.string(),
      }),
    )
    .min(2)
    .max(5),
});

export type DiscoveredTools = z.infer<typeof DiscoveredToolsSchema>;

export interface DiscoverInput {
  count?: number;            // target number to find (2-5)
  excludeNames?: string[];   // tools already covered or queued
}

const SYSTEM_PROMPT = `You are the content scout for @jakobpreneur, a creator who covers AI tools, websites, and automation tips for entrepreneurs, creators, and side hustlers.

Your job: search the live web with the web_search tool and surface NEW, recently trending AI tools and AI-related content worth featuring. Use web_search aggressively — your training data is stale, the web is fresh.

After researching, call submit_discovered_tools EXACTLY ONCE with your final picks. Do not write a text response — your only output should be the tool call.

# CONTENT MIX TARGET (across all suggestions)

- 50% Type 1 — Unknown tools / cool small AI websites most people haven't heard of
- 25% Type 2 — Hidden features of big tools (ChatGPT, Google, Microsoft, Claude, Perplexity, Midjourney, Notion, etc.)
- 25% Type 3 — AI skills, automations, productivity workflows, tips

# HOOK TYPE RULES (mandatory — skill enforces this)

We're in a TESTING PHASE with six hooks live at once. The goal: ROTATE across the menu so no single hook is stuck on one content type. Pick from the allowed set only, and VARY your picks across the batch (don't return all B's — mix B, D, E for Type 1, etc.):

- contentType: unknown_tool → allowed: **A, B, D, E**. Default B, but pick D or E regularly to drive variety. NEVER C or F.
- contentType: hidden_feature → allowed: **A, E**. Default A, pick E when the feature is genuinely new / recently-shipped. NEVER B, C, D, or F.
- contentType: skill_tip → allowed: **C, F**. Default C, pick F when the skill replaces a specific widely-used incumbent (e.g. "stop using Google Docs"). NEVER B, D, or E.

Hook meanings (so you pick the right one, not just a default):
- **A — Curiosity:** "Nobody talks about this…" — vague intrigue, works anywhere the surprise is the payoff.
- **B — Series:** "Powerful AI Tools You Should Know. Part N." — series authority, for discovery-style tool features.
- **C — Bold Claim:** one provocative statement about AI or productivity.
- **D — Insider Secret:** "Here's a website they don't want you to know about." — conspiratorial / insider framing, great for obscure tools.
- **E — Urgency:** "Bookmark this before it goes viral." — scarcity + imperative, requires the tool/feature to genuinely be new or fast-growing.
- **F — Replace-It:** "Stop using [incumbent]. Use this instead." — requires a specific widely-used incumbent the tool displaces.

Hook B has two acceptable phrasings — script generation will pick the right one:
  - "Powerful AI Tools You Should Know, Part [N]" — for AI software, SaaS, apps
  - "Powerful Websites You Should Know, Part [N]" — for browser-based website experiences

**IMPORTANT — variety across batch:** when returning multiple tools in one call, do not give them all the same hook type. Distribute across the allowed set for each content type.

# QUALITY BAR (every tool must hit)

- Genuinely new or recently trending — last 1-3 months ideal. Anything older needs a clear "why now" reason.
- Free or freemium with a meaningful free tier (otherwise viewer can't try it).
- Visually demoable in a 30-second screen recording — boring backend tools or pure APIs don't work.
- Useful to entrepreneurs, creators, or side hustlers.

# TYPE 2 SPECIFICITY RULE (CRITICAL)

For hidden_feature picks (Type 2), the angle must be either:
  (a) A SPECIFIC niche use case most regular users of the parent tool don't know about (e.g. "Did you know you can prompt Gemini to remove watermarks from any image"), OR
  (b) A BRAND-NEW feature that just shipped (last few weeks) — verifiable from your web search.

NEVER pick a Type 2 angle that's just "Tool X has feature Y" if Y has been widely covered in AI news for weeks. Examples of what to AVOID:
  - "Gemini has an image editor inside it" (too well-known by now — every AI newsletter has covered it)
  - "ChatGPT has a code interpreter" (everyone already knows)
  - "Claude has artifacts" (covered to death)

If a tool is well-known but you found a NEW angle (just-launched feature, niche use case, hidden combo), name it explicitly in the reasonInteresting field. If you can't, skip it and find something else.

# WHAT TO AVOID

- Nothing on the user's "already covered" exclude list.
- No paid-only tools without a free tier.
- No vapor — must have a working live site you can search to.
- No generic LLM wrappers indistinguishable from ChatGPT — every tool must have a clear unique angle.
- No misattributing a tool to a famous person ("MrBeast uses X") — those are aspiration, not endorsement.

# DIFFERENTIATION

For each tool, the description must answer "what makes this tool uniquely different from the obvious alternative." Bad: "AI search engine." Good: "AI search engine that cites every source from the live web."

# WORKFLOW

1. Use web_search 3-8 times to research what's actually new or trending right now (Product Hunt today, Hacker News front page, AI newsletter roundups, "what's new in AI", X/Twitter trending).
2. Pick the strongest 2-5 candidates that hit the quality bar.
3. Call submit_discovered_tools ONCE with the final list. Do not output any text — the tool call IS your response.`;

const SUBMIT_TOOLS_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    tools: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Tool / website / feature name" },
          url: { type: "string", description: "Live working URL" },
          category: {
            type: "string",
            description: "Short category, e.g. 'AI Search', 'AI Voice', 'Productivity'",
          },
          description: {
            type: "string",
            description:
              "One sentence — what makes this tool uniquely different, not just its category.",
          },
          contentType: {
            type: "string",
            enum: ["unknown_tool", "hidden_feature", "skill_tip"],
            description:
              "unknown_tool=Type 1 (cool small tool), hidden_feature=Type 2 (hidden feature of a big tool), skill_tip=Type 3 (skill/workflow)",
          },
          suggestedHookType: {
            type: "string",
            enum: ["A", "B", "C", "D", "E", "F"],
            description: "A=Curiosity, B=Series, C=Bold Claim, D=Insider Secret, E=Urgency, F=Replace-It",
          },
          relevanceScore: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            description: "Your judgment of fit for @jakobpreneur (1-100)",
          },
          reasonInteresting: {
            type: "string",
            description: "Why this is worth featuring — recency, virality, novelty, etc.",
          },
        },
        required: [
          "name",
          "url",
          "category",
          "description",
          "contentType",
          "suggestedHookType",
          "relevanceScore",
          "reasonInteresting",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["tools"],
  additionalProperties: false,
};

export async function discoverNewTools(input: DiscoverInput = {}): Promise<DiscoveredTools> {
  const count = input.count ?? 3;
  const exclude = (input.excludeNames ?? []).slice(0, 200);

  const userPrompt = buildUserPrompt(count, exclude);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];

  // Server-side web_search may hit the iteration limit (`pause_turn`).
  // Loop on pause_turn, re-sending the assistant content to continue.
  let response: Anthropic.Message;
  let attempts = 0;
  const maxAttempts = 4;
  while (true) {
    attempts++;
    response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 8 },
        {
          name: "submit_discovered_tools",
          description:
            "Submit your final list of 2-5 discovered AI tools. Call this exactly once after web research.",
          input_schema: SUBMIT_TOOLS_SCHEMA,
        },
      ],
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    if (response.stop_reason === "pause_turn" && attempts < maxAttempts) {
      // Server-side tool sampling cap — append response and continue.
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    break;
  }

  // Find the submit_discovered_tools tool_use block
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === "submit_discovered_tools",
  );
  if (!toolUse) {
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    const preview = textBlock ? textBlock.text.slice(0, 300) : "(no text block)";
    throw new Error(
      `Claude did not call submit_discovered_tools. stop_reason=${response.stop_reason}. text preview: ${preview}`,
    );
  }

  const parsed = DiscoveredToolsSchema.parse(toolUse.input);

  // Defensive enforcement: skill rules constrain hook type by content type.
  // If Claude proposes a hook that's outside the allowed set for the
  // contentType, fall back to that type's default. Otherwise keep Claude's
  // pick — we want variety across the batch so no hook gets stuck on one
  // content type.
  parsed.tools = parsed.tools.map((t) => ({
    ...t,
    suggestedHookType: enforceHookType(t.contentType, t.suggestedHookType),
  }));

  return parsed;
}

type HookCode = "A" | "B" | "C" | "D" | "E" | "F";

// Allowed hook types per content type. Kept in sync with the system prompt.
// Any hook outside the allowed set falls back to the type's default (first).
const ALLOWED_HOOKS: Record<
  "unknown_tool" | "hidden_feature" | "skill_tip",
  HookCode[]
> = {
  unknown_tool: ["B", "A", "D", "E"], // default B
  hidden_feature: ["A", "E"],           // default A
  skill_tip: ["C", "F"],                // default C
};

function enforceHookType(
  contentType: "unknown_tool" | "hidden_feature" | "skill_tip",
  proposed: HookCode,
): HookCode {
  const allowed = ALLOWED_HOOKS[contentType];
  if (allowed.includes(proposed)) return proposed;
  return allowed[0];
}

function buildUserPrompt(count: number, exclude: string[]): string {
  const excludeBlock =
    exclude.length > 0
      ? `\nALREADY COVERED — DO NOT SUGGEST ANY OF THESE:\n${exclude.map((n) => `- ${n}`).join("\n")}\n`
      : "\nNo prior coverage to exclude.\n";

  return `Find ${count} new AI tools, websites, or hidden features worth featuring on @jakobpreneur today.

Use web_search to find what's actually trending right now — check Product Hunt, Hacker News front page, AI newsletter roundups, "what's new in AI" results, Twitter/X trending. Don't rely on your training data alone.
${excludeBlock}
Pick ${count} entries that hit the quality bar in the system prompt. Score each on relevance to the @jakobpreneur audience. Then call submit_discovered_tools exactly once with the final list.`;
}
