import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { renderCarousel } from "@/lib/carousel-renderer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/carousel/generate
 * Renders carousel slides and uploads to Vercel Blob. Returns public URLs.
 *
 * Body JSON: { headline, slides[], toolName, carouselType, closingText? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headline, slides, toolName, carouselType, closingText } = body;

    if (!headline || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json({ error: "headline and slides required" }, { status: 400 });
    }

    // Render all slides
    const imageBuffers = renderCarousel({
      headline,
      slides,
      toolName,
      carouselType,
      closingText,
    });

    // Upload each slide to Vercel Blob
    const timestamp = Date.now();
    const uploads = await Promise.all(
      imageBuffers.map(async (buffer, i) => {
        const blobName = `carousel-${timestamp}-slide-${i + 1}.png`;
        const blob = await put(blobName, buffer, {
          access: "public",
          addRandomSuffix: false,
          contentType: "image/png",
        });
        return blob.url;
      })
    );

    return NextResponse.json({
      slideUrls: uploads,
      slideCount: uploads.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
