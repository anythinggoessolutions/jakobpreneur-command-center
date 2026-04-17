import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/blob/upload
 * Receives a video file from the local pipeline and uploads it to Vercel Blob.
 * Returns a public URL that Instagram can pull from.
 *
 * Body: multipart/form-data with "file" field
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Generate unique name with timestamp
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const blobName = `ig-${timestamp}-${safeName}`;

    const blob = await put(blobName, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "video/mp4",
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
