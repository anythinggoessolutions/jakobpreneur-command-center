export interface Tool {
  id: string;
  name: string;
  url: string;
  source: string;
  sourceUrl?: string;
  category: string;
  description: string;
  status: "queued" | "recorded" | "rejected";
  partNumber: number;
  hookType: "A" | "B" | "C" | "D" | "E" | "F";
  relevanceScore: number;
  rejectionReason?: string;
  recordedDate?: string;
}

export interface Script {
  toolId: string;
  hook: string;
  bridge: string;
  benefit: string;
  demo: string;
  close: string;
  fullScript: string;
  hookType: "A" | "B" | "C" | "D" | "E" | "F";
  estimatedSeconds: number;
}

export interface Tweet {
  toolId: string;
  content: string;
  type: "tool_of_day" | "quick_tip" | "engagement" | "fact" | "repurposed_hook";
}

/**
 * Aspiration carousel — Paul-Hilse-style 9-slide format.
 * Slides 1-3 are celebrity facts with full-bleed AI-generated images.
 * Slides 4-8 are text-on-brand-color (same renderer as tool_breakdown content).
 * Slide 9 is the existing CTA closer.
 *
 * Only populated when CarouselAngle.type === "aspiration".
 */
export interface AspirationSlides {
  celebs: Array<{
    fact: string;           // "MrBeast ships 9 videos a week across 4 channels."
    imagePrompt: string;    // Prompt sent to gpt-image-1
    imageUrl?: string;      // Vercel Blob URL after generation — absent if gen failed
  }>;                        // exactly 3 entries
  thesis: string;            // slide 4 — "Top creators don't type more. They systemize more."
  transition: string;        // slide 5 — "You don't have their team. But you have AI."
  toolIntro: string;         // slide 6 — tool name + one-line what-it-does
  benefit: string;           // slide 7 — why it matters
  scale: string;             // slide 8 — platforms / reach / proof
}

export interface CarouselAngle {
  toolId: string;
  type: "famous_person" | "tool_breakdown" | "aspiration";
  headline: string;
  slides: string[];                 // used by tool_breakdown / famous_person (unchanged)
  aspiration?: AspirationSlides;    // only present when type === "aspiration"
}

export interface QueuedTool {
  tool: Tool;
  script: Script;
  tweets: Tweet[];
  carousel: CarouselAngle;
}
