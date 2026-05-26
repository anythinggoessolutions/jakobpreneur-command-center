/**
 * GodText AI conversation-script generation via Anthropic API.
 *
 * Reads rizz-vault screenshots (real viral text conversations) as visual
 * reference, then generates an original conversation between a man using
 * GodText AI and a woman he's texting. Output is a JSON array of message
 * objects ready to drive the phone mockup component + the generating-screen
 * insert beats.
 *
 * IMPORTANT — brand boundary: this file is GodText AI only. The system
 * prompt and all output references GodText AI exclusively. Never mix in
 * JakobPreneur language, tone, or branding.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

export const GodTextConversationSchema = z.object({
  scenario: z
    .string()
    .describe(
      "One short phrase setting the context (e.g. 'Hinge match opener', 'IG story reply', 'recovery from being left on read').",
    ),
  platform: z
    .enum(["Hinge", "Instagram", "Tinder", "iMessage"])
    .describe("Which app/platform UI this conversation should render in."),
  womanName: z
    .string()
    .describe(
      "The woman's first name displayed in the chat header. Pick a different, common first name every time — never repeat the same name across calls. Examples: Sofia, Jess, Aaliyah, Priya, Chloe, Mia, Lauren, Destiny, Nadia, etc.",
    ),
  hookText: z
    .string()
    .describe(
      "The cold-open text overlay (1 line, all-lowercase punchy hook in the style of viral rizz TikToks).",
    ),
  messages: z
    .array(
      z.object({
        sender: z.enum(["man", "woman"]),
        text: z.string().describe("Message body. Short, natural, app-realistic."),
        show_godtext_ui: z
          .boolean()
          .optional()
          .describe(
            "True ONLY on man messages where the GodText AI generating screen should play before this message is shown sending. Should be true on 2-3 of the man's messages.",
          ),
        escalation_level: z
          .enum(["low", "medium", "high", "maximum"])
          .optional()
          .describe(
            "ONLY on woman messages. Drives hype-clip intensity selection in the video assembly step. Final woman message should be 'maximum'.",
          ),
      }),
    )
    .min(4)
    .max(12),
});

export type GodTextConversation = z.infer<typeof GodTextConversationSchema>;

const SYSTEM_PROMPT = `You are a conversation script writer for GodText AI, a texting app that helps men text women. You write realistic text conversations that will be turned into short-form videos for TikTok, Instagram Reels, and YouTube Shorts.

KEY CONTEXT: The man is ALWAYS the sender. He uses GodText AI to generate what to say. The woman is ALWAYS the one responding. This is a texting app FOR MEN — the man screenshots his conversation with a woman, GodText AI analyzes it and tells him exactly what to send next, and the woman responds to that message.

You have been provided with screenshots of real viral "rizz" text conversations. STUDY THEM CAREFULLY. Match the tone, pacing, confidence level, and style of the openers and responses you see in those images. Your generated conversations should feel like they belong in the same category as those viral examples.

Rules:
- The man's messages are short (1-2 sentences max), confident, playful, and slightly teasing — matching the energy of the viral examples provided
- The woman starts skeptical or giving short responses, then gradually gets more interested
- Each conversation is 4-6 back-and-forth exchanges (so 8-12 total messages)
- The man is NEVER creepy, sexual, or disrespectful
- The woman's responses feel realistic — she might challenge him, be confused, or play hard to get, but she stays engaged
- The final woman message is a clear "win" (gives her number, agrees to a date, sends a selfie/photo, or shows obvious genuine interest)
- If the woman gives her number, it MUST be a full 10-digit US phone number in a realistic format (e.g. "555-867-5309", "(555) 234-5678"). Never use a 7-digit number — always include the area code.
- Vary the scenario: dating-app match opener, Instagram story reply, cold DM, recovery from being left on read

UI flag rules:
- Set show_godtext_ui: true on 2-3 of the man's messages (NOT the first, NOT every one)
- These are the moments where the video cuts to the GodText AI generating screen before showing the man's message land

Escalation rules:
- Every woman message gets an escalation_level
- Start at "low" (one-word or short response), climb through "medium" and "high"
- Final woman message MUST be "maximum"

Hook text rules:
- 1 line, all-lowercase, punchy, viral-style
- Examples: "letting godtext cook on hinge", "she wasn't ready for this AI", "godtext went CRAZY on this one"
- Emojis allowed, max 1
- NEVER mention JakobPreneur, the developer, or any other brand. GodText AI is the only brand referenced.

Platform rule — CRITICAL:
- You MUST rotate across all four platforms evenly: Hinge, Instagram, Tinder, iMessage.
- NEVER default to Instagram. Treat all four platforms as equally likely.
- Hinge: dating-app openers, witty first messages, rose conversations
- Instagram: story replies, DM slides, reel comments turned to DMs
- Tinder: match openers, bio references, pickup lines
- iMessage: post-number exchanges, date logistics, flirty follow-ups
- If given an "exclude platforms" hint, you MUST pick a DIFFERENT platform from those listed.

Name rule:
- Pick a random, realistic first name for the woman every single time. NEVER reuse the same name across scripts. Vary ethnicity, length, and vibe — Sofia, Jess, Aaliyah, Priya, Chloe, Destiny, Nadia, Lauren, Mia, etc. No two consecutive scripts should share a name.`;

/**
 * Generate a conversation script using a curated set of rizz-vault images
 * as visual reference. `referenceImageUrls` should be publicly-accessible
 * URLs (Vercel Blob URLs work) — Anthropic fetches them server-side.
 *
 * If no reference images are supplied, the model still works but quality
 * will drop. The route surfaces a warning to the user when the vault is
 * empty.
 */
export async function generateGodTextConversation(
  referenceImageUrls: string[] = [],
  options: { scenarioHint?: string; platformHint?: string; excludePlatforms?: string[]; excludeNames?: string[] } = {},
): Promise<GodTextConversation> {
  // Cap image references to avoid blowing past the request size limit.
  // 6 images is plenty for stylistic transfer; more burns tokens for
  // diminishing returns.
  const cappedUrls = referenceImageUrls.slice(0, 6);

  const userContent: Anthropic.Messages.ContentBlockParam[] = [];

  if (cappedUrls.length > 0) {
    userContent.push({
      type: "text",
      text: `Reference screenshots of viral rizz conversations follow. Study them, then write a new conversation in the same vibe.`,
    });
    for (const url of cappedUrls) {
      userContent.push({
        type: "image",
        source: { type: "url", url },
      });
    }
  }

  const hintParts: string[] = [];
  if (options.scenarioHint) hintParts.push(`Scenario hint: ${options.scenarioHint}`);
  if (options.platformHint) hintParts.push(`Platform hint: ${options.platformHint}`);
  if (options.excludePlatforms && options.excludePlatforms.length > 0) {
    hintParts.push(
      `EXCLUDE these platforms (already used in this batch): ${options.excludePlatforms.join(", ")}. Pick a DIFFERENT one.`
    );
  }
  if (options.excludeNames && options.excludeNames.length > 0) {
    hintParts.push(
      `EXCLUDE these woman names (already used in this batch): ${options.excludeNames.join(", ")}. Pick a COMPLETELY DIFFERENT name.`
    );
  }

  userContent.push({
    type: "text",
    text:
      [
        "Generate one new conversation now, following all the rules.",
        ...hintParts,
        "Return ONLY the JSON object — no preamble, no markdown fences.",
      ].join("\n\n"),
  });

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(GodTextConversationSchema),
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Stable system prompt — cache it for repeat calls.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Claude did not return a parseable conversation. stop_reason=${response.stop_reason}`,
    );
  }
  return response.parsed_output;
}
