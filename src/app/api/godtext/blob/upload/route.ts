import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/godtext/blob/upload
 *
 * Client-direct upload for the GodText vault grids. Accepts image, video,
 * and audio types — the browser POSTs here once to get a scoped client
 * token, then PUTs the bytes directly to Vercel Blob (sidesteps the 4.5 MB
 * function body limit). Mirrors the JakobPreneur /api/blob/upload route
 * but with a broader content-type allowlist and a `godtext/` filename
 * prefix so storage stays separated by brand.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          // Rizz Vault + UI References — screenshots
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/gif",
          // Hype Clips — short videos + GIFs
          "video/mp4",
          "video/quicktime",
          "video/webm",
          // Music Vault — audio
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/mp4",
          "audio/x-m4a",
          "audio/aac",
        ],
        // Hype clips can be ~5-10 MB; songs up to ~10 MB; padding for cover.
        maximumSizeInBytes: 100 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: "",
      }),
      onUploadCompleted: async () => {
        // The client follows up with POST to the matching vault route
        // to persist the record in Airtable. Nothing to do here.
      },
    });

    return NextResponse.json(json);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
