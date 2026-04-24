/**
 * OpenAI image generation via `gpt-image-1`.
 *
 * Generates celeb-hook slide backgrounds for the aspiration carousel format.
 * Images are uploaded to Vercel Blob so the carousel renderer can fetch them
 * and composite them behind the text overlay.
 *
 * Any failure here (refused prompt, rate limit, auth error, bad response)
 * returns null — the caller MUST treat a null URL as "fall back to text-only
 * rendering for this slide." Never let a bad image gen break a carousel ship.
 */

import OpenAI from "openai";
import { put } from "@vercel/blob";

const client = new OpenAI();

export interface GeneratedImage {
  url: string;       // Vercel Blob URL — ready to fetch + composite
  prompt: string;    // Echo of the prompt we sent (for debugging + Airtable)
}

/**
 * Generate a single image and upload the result to Vercel Blob.
 * Returns null on any failure — caller falls back to text-only rendering.
 */
export async function generateCarouselImage(
  prompt: string,
  opts: { quality?: "low" | "medium" | "high"; size?: "1024x1024" | "1024x1536" | "1536x1024" } = {},
): Promise<GeneratedImage | null> {
  const quality = opts.quality ?? "high";
  // 1024x1536 matches the 2:3 aspect of the 1080x1350 carousel frame.
  const size = opts.size ?? "1024x1536";

  try {
    const res = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      quality,
      size,
      n: 1,
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[openai-images] empty response — no b64_json");
      return null;
    }

    const buf = Buffer.from(b64, "base64");
    const filename = `carousel-bg/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

    const blob = await put(filename, buf, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    return { url: blob.url, prompt };
  } catch (err) {
    // Refusals, auth errors, rate limits, network issues all land here.
    // Log and return null; never throw — the carousel must still ship.
    console.error("[openai-images] generation failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Generate multiple images in parallel. Each slot resolves to a GeneratedImage
 * or null independently — one failure doesn't cancel the others.
 */
export async function generateCarouselImages(
  prompts: string[],
  opts: Parameters<typeof generateCarouselImage>[1] = {},
): Promise<(GeneratedImage | null)[]> {
  return Promise.all(prompts.map((p) => generateCarouselImage(p, opts)));
}
