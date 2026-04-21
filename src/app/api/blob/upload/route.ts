import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/blob/upload
 *
 * Client-direct upload flow — the Mac pipeline POSTs here to get a
 * scoped client token, then PUTs the MP4 bytes directly to Vercel Blob
 * storage (bypassing this function's 4.5 MB body limit).
 *
 * Vercel's @vercel/blob/client.handleUpload handles the full dance:
 * token generation (on `blob.generate-client-token` events) and the
 * upload-completed callback (on `blob.upload-completed`). The Mac
 * replicates what the JS client SDK does — POST here once to get a
 * clientToken, PUT to https://vercel.com/api/blob/<pathname> with it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        // Mac uploads face-cam MP4s. Pad the size limit generously; a
        // 60-second 1080p H.264 short is typically ~30-60 MB.
        allowedContentTypes: ["video/mp4"],
        maximumSizeInBytes: 250 * 1024 * 1024, // 250 MB
        addRandomSuffix: false,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async () => {
        // Nothing to do — Mac follows up with /api/videos/schedule
        // passing the blob URL directly, so we don't need to record
        // anything here.
      },
    });

    return NextResponse.json(json);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
