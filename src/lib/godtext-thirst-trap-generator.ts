/**
 * GodText AI — Thirst Trap Carousel content generator.
 *
 * Uses Claude to generate psychology-driven carousel slide content:
 * hook → tips that build curiosity → CTA to download GodText AI.
 *
 * Each slide gets a baddie photo background with a text overlay.
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

export const ThirstTrapCarouselSchema = z.object({
  topic: z
    .string()
    .describe("Short topic label (e.g. 'texts that make her obsessed')"),
  slides: z
    .array(
      z.object({
        headline: z
          .string()
          .describe(
            "Bold headline text for this slide. Short, punchy, 1-2 lines max.",
          ),
        subtext: z
          .string()
          .optional()
          .describe(
            "Optional smaller text below the headline. 1 sentence max.",
          ),
        slideType: z
          .enum(["hook", "tip", "twist", "cta"])
          .describe(
            "hook = first slide, tip = value slides, twist = the pivot, cta = download slide",
          ),
      }),
    )
    .min(6)
    .max(9),
});

export type ThirstTrapCarousel = z.infer<typeof ThirstTrapCarouselSchema>;

const SYSTEM_PROMPT = `You are a viral social media content strategist for GodText AI, a texting app that helps men text women better. You create carousel slide content that uses psychological hooks to keep people swiping.

Your carousels follow this proven structure:
1. HOOK slide: A bold, curiosity-driven headline that stops the scroll. Written from a woman's perspective or as dating wisdom. Examples: "5 texts that make her obsessed with you", "Why she stopped texting you back", "What girls actually want you to text (from a girl)"
2. TIP slides (3-5): Each tip builds on the last. Use open loops — hint at the next tip so they HAVE to swipe. Each tip should feel like genuine dating/texting insight. Be specific, not generic. Reference real texting scenarios.
3. TWIST slide: The pivot. "But knowing what to text every time is impossible on your own..." or "The problem is, most guys freeze when it matters most..."
4. CTA slide: The payoff. Introduce GodText AI as the solution. "There's an app that analyzes your convo and tells you exactly what to say. Download GodText AI — link in bio"

Rules:
- Headlines are SHORT. Max 8-10 words. Bold, punchy, scroll-stopping.
- Subtext is optional and brief. 1 sentence max. Adds context to the headline.
- Use conversational, Gen Z tone. Not formal. Not corporate.
- Each tip should make them think "wait, what?" so they swipe for more.
- Never be creepy or disrespectful toward women. This is about genuine connection.
- The CTA should feel like a natural solution, not a hard sell.
- Vary topics: don't repeat the same carousel topic. Cover different angles of texting/dating.

Topic variety — rotate across these angles:
- Texts that create attraction
- What to do when she leaves you on read
- First text after getting her number
- Red flags in her texts (and what to send instead)
- How to keep the convo going when it's dying
- What girls actually want you to text
- The psychology behind why certain texts work
- Common texting mistakes guys make`;

export async function generateThirstTrapCarousel(): Promise<ThirstTrapCarousel> {
  const response = await client.messages.parse({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    output_config: {
      format: zodOutputFormat(ThirstTrapCarouselSchema),
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          "Generate one thirst trap carousel now. Pick a fresh, specific topic. Make the hook irresistible and each tip an open loop that forces them to swipe.",
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return structured output for thirst trap carousel");
  }

  return response.parsed_output;
}
