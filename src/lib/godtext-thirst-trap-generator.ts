/**
 * GodText AI — Thirst Trap Carousel content generator.
 *
 * Uses Claude to generate psychology-driven carousel slide content in
 * multiple formats: tips, stories, comparisons, POV scenarios, and hot takes.
 * Claude also picks a font pairing from a curated set to match the vibe.
 *
 * Each slide gets a baddie photo background with a text overlay.
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

// ---------------------------------------------------------------------------
// Font pairings available in the render component (Google Fonts)
// ---------------------------------------------------------------------------
export const FONT_PAIRINGS = {
  syne: { headline: "Syne", body: "DM Sans", vibe: "bold modern tech" },
  bebas: { headline: "Bebas Neue", body: "Inter", vibe: "tall impactful editorial" },
  space: { headline: "Space Grotesk", body: "Space Grotesk", vibe: "clean techy minimal" },
  playfair: { headline: "Playfair Display", body: "Lato", vibe: "elegant sophisticated classy" },
  oswald: { headline: "Oswald", body: "Source Sans 3", vibe: "condensed punchy sporty" },
} as const;

export type FontPairing = keyof typeof FONT_PAIRINGS;

export const ThirstTrapCarouselSchema = z.object({
  topic: z
    .string()
    .describe("Short topic label for internal tracking (e.g. 'the 2am text that changes everything')"),
  format: z
    .enum(["tips", "story", "vs", "pov", "hot-take"])
    .describe(
      "tips = hook→value slides→twist→CTA (classic listicle). " +
      "story = first-person narrative that builds tension slide by slide. " +
      "vs = comparison carousel ('what she says' vs 'what she means', or before/after). " +
      "pov = scenario-based ('POV: you sent this and she...') with escalating reactions. " +
      "hot-take = controversial dating opinion that drives comments and debate.",
    ),
  fontPairing: z
    .enum(["syne", "bebas", "space", "playfair", "oswald"])
    .describe(
      "Pick the font vibe that matches this carousel's energy. " +
      "syne = bold modern (good for tips, hot takes). " +
      "bebas = tall impactful editorial (good for story, dramatic reveals). " +
      "space = clean techy minimal (good for vs comparisons, data-driven). " +
      "playfair = elegant sophisticated (good for 'from a girl's perspective', classy advice). " +
      "oswald = condensed punchy sporty (good for POV, high-energy content).",
    ),
  slides: z
    .array(
      z.object({
        headline: z
          .string()
          .describe(
            "Bold headline text for this slide. SHORT — max 8 words. Punchy, scroll-stopping. Not a full sentence.",
          ),
        subtext: z
          .string()
          .optional()
          .describe(
            "Optional smaller text below the headline. Max 1 short sentence. Adds context or builds the open loop to the next slide.",
          ),
        slideType: z
          .enum(["hook", "tip", "twist", "cta"])
          .describe(
            "MUST be one of these exact 4 values regardless of carousel format. " +
            "hook = ALWAYS the first slide. " +
            "tip = ALL middle content slides (tips, story beats, comparison panels, POV moments — they all use 'tip'). " +
            "twist = the single pivot slide near the end. " +
            "cta = ALWAYS the last slide (GodText AI download).",
          ),
      }),
    )
    .min(6)
    .max(9),
});

export type ThirstTrapCarousel = z.infer<typeof ThirstTrapCarouselSchema>;

const SYSTEM_PROMPT = `You are a viral carousel content creator for GodText AI, a texting app that helps men text women better. You create carousel content that gets saved, shared, and argued about in the comments.

You have 5 carousel FORMATS to choose from. Pick the one that best fits the topic angle you're given:

## FORMAT 1: Tips (hook → tips → twist → CTA)
Classic listicle. Each tip is a genuine insight, not generic advice.
BAD tip: "Be confident in your texts" (vague, obvious, could be in any article)
GOOD tip: "Reply to her story with a question about the background, not the selfie" (specific, actionable, makes them think)
BAD tip: "Don't double text" (everyone knows this)
GOOD tip: "If she takes 3hrs to reply, match her energy — then break the pattern on the 4th message" (specific technique)

## FORMAT 2: Story (first-person narrative)
Tell a texting scenario slide by slide. Build tension. Make them swipe to see what happened.
Slide 1: "She left me on read for 3 days"
Slide 2: "So I sent her this instead of triple texting..."
Slide 3: [Show the specific text]
Slide 4: "20 minutes later..."
Slide 5: [Her response]
Slide 6: Twist — "The app that wrote that for me"
Slide 7: CTA

## FORMAT 3: Vs / Comparison
Side-by-side contrast that makes the difference obvious.
"What she texts" vs "What she actually means"
"Average guy's text" vs "What she wished you sent"
"Your opener" vs "The opener that actually works"
Each slide is one comparison pair.

## FORMAT 4: POV
Scenario-based content with escalating reactions.
"POV: You used AI to text her and now she thinks you're a poet"
Each slide shows the escalation — her reactions getting more intense.
Works great for humor and relatability.

## FORMAT 5: Hot Take
A controversial dating/texting opinion that drives engagement.
"Unpopular opinion: Girls prefer getting texted back late"
Build the argument slide by slide, then reveal GodText AI as the tool.
The take should be specific enough to trigger "wait, actually that's true" moments.

## RULES FOR ALL FORMATS:
- Headlines are MAX 8 words. Not sentences. Fragments. Punches.
- Subtext is optional. If used, max 1 SHORT sentence.
- Every carousel ends with a CTA slide introducing GodText AI naturally.
- Gen Z tone. Lowercase energy. Not corporate. Not cringe.
- Be SPECIFIC. Real scenarios, real text examples, real psychology.
- Never be creepy or disrespectful. This is about genuine connection.
- Humor is good. Self-awareness is good. Arrogance is bad.

## WHAT MAKES CONTENT GO VIRAL ON CAROUSELS:
- The hook has to create a knowledge gap ("I need to know what happens")
- Open loops between slides ("but the next text changed everything...")
- Specificity beats generality (real text examples > abstract advice)
- Controversy drives comments ("this is so true" vs "this is cap")
- Save-worthy content = "I need to remember this" moments`;

// ---------------------------------------------------------------------------
// Topic angles — much broader than just "texting tips"
// ---------------------------------------------------------------------------
const TOPIC_ANGLES = [
  // Texting technique
  "the exact text that made her go from dry to interested",
  "why the 'mirror technique' works better than any pickup line",
  "the 3-second rule for texting that most guys break every time",
  "how to make her text YOU first without playing games",
  // Story-based
  "she ghosted me for 2 weeks, then I sent this one text",
  "I let AI write my tinder opener and she thought I was a writer",
  "she said 'you're different' after my third message",
  "my friend sent the wrong text and accidentally cooked",
  // Comparison / vs
  "what she says in the group chat vs what she texts you",
  "average texter vs the guy she can't stop thinking about",
  "the text you'd send vs the text that actually works",
  "how you text her vs how she wants to be texted",
  // POV scenarios
  "POV: she screenshots your text to show her friends but in a good way",
  "POV: you finally know exactly what to text and it's scary how well it works",
  "POV: her friends are reading your texts out loud and they're impressed",
  "POV: you stopped overthinking texts and started letting AI handle it",
  // Hot takes / controversial
  "unpopular opinion: girls prefer short texts over long paragraphs",
  "hot take: the best texters aren't naturally smooth, they have a system",
  "controversial: being 'authentic' over text is actually holding you back",
  "the reason she's losing interest has nothing to do with what you look like",
  // Psychology / insight
  "the psychology behind why she re-reads certain texts",
  "why the funniest text isn't always the best text to send",
  "what your response time tells her about you (and it's not what you think)",
  "the one texting pattern that separates friendzone from boyfriend",
  // Specific scenarios
  "what to text after she gives you her number (most guys blow this)",
  "the first date follow-up text that gets a second date 90% of the time",
  "how to text when she's giving one-word answers without looking desperate",
  "the 'callback text' technique that makes her smile every time",
  // From her perspective
  "things girls notice in your texts that you don't even realize",
  "the text that made me actually want to go on a date with him",
  "what makes a girl screenshot your text (from a girl)",
  "the difference between a text she ignores and one she replies to in seconds",
  // Cultural / trend
  "why gen z dating is all about the text game now",
  "the texting move that's replacing pickup lines in 2026",
  "how AI is changing the dating game and most people don't realize it yet",
  "the reason 'hey' doesn't work anymore and what to send instead",
];

export async function generateThirstTrapCarousel(): Promise<ThirstTrapCarousel> {
  // Pick a random topic angle to force variety each generation
  const angle = TOPIC_ANGLES[Math.floor(Math.random() * TOPIC_ANGLES.length)];

  const response = await client.messages.parse({
    model: "claude-opus-4-7",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
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
        content: `Generate one carousel now. Your topic angle: "${angle}".

Pick the best FORMAT for this topic (tips, story, vs, pov, or hot-take).
Pick the best FONT PAIRING for the vibe.
Make every slide specific and surprising — no generic advice that could be in any dating blog.
Headlines are short punches, not sentences. Max 8 words.
The hook must create a knowledge gap that forces the swipe.`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return structured output for thirst trap carousel");
  }

  return response.parsed_output;
}
