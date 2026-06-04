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
      "The woman's first name displayed in the chat header. Pick a DIFFERENT name every single time. Pull from a wide range — short names, long names, trendy names, classic names, names from different cultures. Never fall back on the same 10 names.",
    ),
  hookText: z
    .string()
    .describe(
      "Short text overlay shown on screen during the hook frame. Should reference the specific scenario — e.g. 'texting a girl from hinge', 'rizz on text', 'she left me on read'. Pulled from trending TikTok search terms. All lowercase, no punctuation, 3-6 words max.",
    ),
  hookVoiceover: z
    .string()
    .describe(
      "British narrator voiceover that plays over the hook frame. 2 sentences: first is a hype/funny setup line about what's about to happen, second is ALWAYS a follow CTA. " +
      "Must be contextual to this specific conversation scenario. " +
      "Style: BBC narrator watching a trainwreck unfold. Dry, confident, slightly amused. Mild UK cursing allowed (bloody, taking the piss, bin him off). " +
      "MUST end with one of these follow CTAs (pick randomly): " +
      "'Follow for more AI rizz.' / 'Follow to keep up with the rizz.' / 'Follow before your ex does.' / " +
      "'Follow for daily rizz upgrades.' / 'Follow if your texts need saving.' / 'Follow to stop fumbling.' / " +
      "'Follow for more dangerous rizz.' / 'Follow before you get left on read.' / 'Follow for more GodText plays.' / " +
      "'Follow to watch AI do the flirting.' " +
      "Example full line: 'Watch this bloke use AI to pull a girl way out of his league. Follow to keep up with the rizz.'",
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
        commentary: z
          .string()
          .optional()
          .describe(
            "Documentary narrator voiceover that plays BEFORE this message appears. " +
            "Written as a British nature-documentary commentator observing the texting like wildlife. " +
            "Short (1-2 sentences max). Funny, dry, witty. Occasionally curses for comedic effect. " +
            "Only 3-5 messages should have commentary — NOT every message. " +
            "MUST appear on: the first message (scene-setting), at least one GodText AI moment, and the final woman message (the payoff). " +
            "Examples: 'And here we observe the young male, preparing his opening gambit.', " +
            "'He\\'s called in reinforcements. The AI is cooking.', " +
            "'Bloody hell. She\\'s actually going for it.', " +
            "'And just like that... another one falls.'",
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

Hook text rules (the TEXT overlay on screen):
- Short, lowercase, no punctuation, 3-6 words max
- Should reference the specific scenario using trending TikTok search terms
- Examples: "texting a girl from hinge", "rizz on text", "she left me on read", "how to rizz up on text", "texting her back", "AI rizz tutorial", "dry texts fixed by AI"
- No emojis, no brand mentions — just the scenario in search-friendly language
- NEVER mention JakobPreneur, the developer, or any other brand.

Hook voiceover rules (the SPOKEN narration over the hook frame):
- British narrator (same character as the commentary) hypes up what's about to happen
- 2 sentences: setup line + follow CTA
- Setup line is contextual to this specific scenario — reference what's about to happen
- Must sound natural spoken aloud by a British man, not written
- Mild UK cursing encouraged (bloody, taking the piss, bin him off, etc.)
- ALWAYS ends with a follow CTA picked randomly from the approved list
- Style reference — these are the approved tone/format:
  * "Right then, watch this bloke use AI to pull a girl way out of his league."
  * "She left him on read. Big mistake, apparently."
  * "This lad's got the chat skills of a brick. Good thing he's got AI."
  * "Watch AI turn this absolute disaster into a date."
  * "This might be the most disrespectful amount of rizz I've ever seen."
  * "He couldn't pull a door open. Watch this."
  * "This bloke outsourced his personality to AI and somehow it worked."
  * "The scary bit is how well this actually works."
  * "She was ready to bin him off. Then this happened."
  * "Honestly, this should probably be illegal."
  * "This girl thought she had the upper hand. Bless her."
- Generate a NEW line each time that fits the specific scenario. Don't copy these exactly — match the vibe.

Platform rule — CRITICAL:
- You MUST rotate across all four platforms evenly: Hinge, Instagram, Tinder, iMessage.
- NEVER default to Instagram. Treat all four platforms as equally likely.
- Hinge: dating-app openers, witty first messages, rose conversations
- Instagram: story replies, DM slides, reel comments turned to DMs
- Tinder: match openers, bio references, pickup lines
- iMessage: post-number exchanges, date logistics, flirty follow-ups
- If given an "exclude platforms" hint, you MUST pick a DIFFERENT platform from those listed.

Name rule:
- Pick a random, realistic first name for the woman every single time. NEVER reuse the same name across scripts. Pull from a WIDE pool. Do NOT use names from the examples — invent your own every time. Mix short (3-4 letters), medium, and long names from different backgrounds. Be creative and unpredictable. If a name feels obvious or common, pick something else.

Commentator voiceover rules:
- Each video has a British documentary narrator (think David Attenborough observing wildlife, but he's watching someone text a girl).
- Add a "commentary" field to 3-5 messages (NOT every message). The commentary plays as voiceover BEFORE that message appears on screen.
- The narrator is dry, witty, occasionally drops a mild curse word for comedic effect (bloody hell, taking the piss, etc.).
- He treats the texting conversation like a nature documentary — "the young male", "the female", "a bold strategy", "observe closely".
- MANDATORY commentary on: (1) the very first message (sets the scene), (2) at least one message with show_godtext_ui (narrates the AI helping), (3) the final woman message (the payoff reaction).
- Keep each line SHORT — 1-2 sentences max. It needs to fit naturally in the pauses between messages.
- The humor comes from the contrast between the serious documentary tone and the silly texting situation. Don't try too hard — understated is funnier.`;

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
  options: { scenarioHint?: string; platformHint?: string; excludeNames?: string[] } = {},
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
  if (options.platformHint) {
    hintParts.push(
      `MANDATORY PLATFORM: You MUST use "${options.platformHint}" as the platform for this conversation. This is not a suggestion — it is required.`
    );
  }
  if (options.excludeNames && options.excludeNames.length > 0) {
    hintParts.push(
      `EXCLUDE these woman names (already used): ${options.excludeNames.join(", ")}. Pick a COMPLETELY DIFFERENT name.`
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
