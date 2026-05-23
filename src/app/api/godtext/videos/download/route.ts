import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/godtext/videos/download?path=<absolute-path>
 *
 * Serves a finished MP4 from the local output directory. Only files
 * inside the godtext output folder are allowed (no arbitrary file reads).
 */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  // Security: only allow files inside the godtext output directory
  const allowedDir = path.join(process.cwd(), "..", "output", "godtext");
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(allowedDir))) {
    return NextResponse.json({ error: "path not allowed" }, { status: 403 });
  }

  try {
    const stat = await fs.stat(resolved);
    const buffer = await fs.readFile(resolved);
    const filename = path.basename(resolved);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
