import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const execAsync = promisify(execFile);
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ---------------------------------------------------------------------------
// Playwright helpers
// ---------------------------------------------------------------------------

type PlaywrightPage = {
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  setContent: (html: string, opts?: { waitUntil?: string }) => Promise<void>;
  screenshot: (opts: {
    type?: string;
    clip?: { x: number; y: number; width: number; height: number };
  }) => Promise<Buffer>;
  close: () => Promise<void>;
};

async function launchBrowser() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pw = require("playwright") as {
      chromium: {
        launch: (opts: { headless: boolean }) => Promise<{
          newPage: () => Promise<PlaywrightPage>;
          close: () => Promise<void>;
        }>;
      };
    };
    return pw.chromium.launch({ headless: true });
  } catch {
    throw new Error(
      "Playwright not available. Video rebranding only works locally.",
    );
  }
}

// ---------------------------------------------------------------------------
// GodText AI frame HTML template
// ---------------------------------------------------------------------------

function buildFrameHtml(w: number, h: number): string {
  const scale = w / 720;
  const s = (px: number) => Math.round(px * scale);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: ${w}px; height: ${h}px;
  background: #B8DFFB;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  overflow: hidden;
}
.container {
  width: ${w}px; height: ${h}px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.header {
  width: ${s(680)}px; display: flex; align-items: center;
  justify-content: space-between; padding: ${s(12)}px ${s(16)}px;
}
.back-arrow { font-size: ${s(42)}px; font-weight: 300; color: #E02020; }
.app-name {
  font-size: ${s(52)}px; font-weight: 900; font-style: italic;
  color: #E02020; text-shadow: ${s(2)}px ${s(2)}px ${s(4)}px rgba(0,0,0,0.2);
  letter-spacing: -1px;
}
.plus { font-size: ${s(42)}px; font-weight: 300; color: #E02020; }
.chat-box {
  width: ${s(680)}px; height: ${s(460)}px; background: #0a0a0a;
  border-radius: ${s(24)}px; padding: ${s(40)}px ${s(24)}px;
  display: flex; flex-direction: column;
  justify-content: center; gap: ${s(20)}px;
}
.msg-row { display: flex; }
.msg-row.sent { justify-content: flex-end; }
.msg-row.received { justify-content: flex-start; }
.bubble {
  padding: ${s(14)}px ${s(24)}px; border-radius: ${s(22)}px;
  font-size: ${s(22)}px; font-weight: 500; max-width: 80%;
}
.bubble.sent { background: #7B4FE0; color: white; }
.bubble.received { background: #3a3a3c; color: white; }
.tap-to-copy {
  color: #7a8a9a; font-size: ${s(20)}px;
  margin-top: ${s(14)}px; text-align: center;
}
.reply-row {
  display: flex; justify-content: flex-end;
  margin-top: ${s(16)}px; padding-right: ${s(20)}px;
}
.reply-bubble {
  background: #1DA1F2; color: white;
  padding: ${s(16)}px ${s(28)}px; border-radius: ${s(22)}px;
  font-size: ${s(24)}px; font-weight: 600;
}
</style></head><body>
<div class="container">
  <div class="header">
    <span class="back-arrow">&lsaquo;</span>
    <span class="app-name">GodText AI</span>
    <span class="plus">+</span>
  </div>
  <div class="chat-box">
    <div class="msg-row sent">
      <div class="bubble sent">Where did you get that?</div>
    </div>
    <div class="msg-row received">
      <div class="bubble received">Get what?</div>
    </div>
  </div>
  <div class="tap-to-copy">tap to copy</div>
  <div class="reply-row">
    <div class="reply-bubble">That beautiful smile</div>
  </div>
</div>
</body></html>`;
}

// ---------------------------------------------------------------------------
// TikTok watermark-free download via tikwm
// ---------------------------------------------------------------------------

async function downloadTikTokNoWatermark(
  tiktokUrl: string,
  destPath: string,
): Promise<void> {
  const apiUrl = "https://www.tikwm.com/api/";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `url=${encodeURIComponent(tiktokUrl)}&hd=1`,
  });

  if (!res.ok) throw new Error(`TikWM API error: ${res.status}`);
  const data = await res.json();

  if (data.code !== 0 || !data.data?.play) {
    throw new Error(
      data.msg || "Could not get watermark-free video from TikTok",
    );
  }

  const videoUrl: string = data.data.hdplay || data.data.play;
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok)
    throw new Error(`Video download failed: ${videoRes.status}`);
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

// ---------------------------------------------------------------------------
// Detect competitor app frames via pixel color analysis
// ---------------------------------------------------------------------------

async function detectCompetitorFrames(
  videoPath: string,
  jobDir: string,
): Promise<{ start: number; end: number } | null> {
  const framesDir = path.join(jobDir, "detect-frames");
  await fs.mkdir(framesDir, { recursive: true });

  const { stdout: durationOut } = await execAsync(FFPROBE, [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    videoPath,
  ]);
  const duration = parseFloat(durationOut.trim());
  if (isNaN(duration) || duration <= 0) return null;

  // Extract frames at 2fps for detection
  await execAsync(FFMPEG, [
    "-y", "-i", videoPath,
    "-vf", "fps=2",
    "-q:v", "2",
    path.join(framesDir, "frame-%04d.png"),
  ]);

  const frameFiles = (await fs.readdir(framesDir))
    .filter((f) => f.endsWith(".png"))
    .sort();

  // Score each frame
  const scores: { timestamp: number; match: boolean }[] = [];
  for (let i = 0; i < frameFiles.length; i++) {
    const framePath = path.join(framesDir, frameFiles[i]);
    const match = await isCompetitorFrame(framePath);
    scores.push({ timestamp: i * 0.5, match });
  }

  // Find the longest consecutive run of matching frames (at least 2 in a row)
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let runStart = -1;
  let runLen = 0;

  for (const s of scores) {
    if (s.match) {
      if (runStart < 0) runStart = s.timestamp;
      runLen++;
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
        bestEnd = s.timestamp;
      }
    } else {
      runStart = -1;
      runLen = 0;
    }
  }

  // Need at least 2 consecutive matching frames (1 second)
  if (bestLen < 2) return null;

  const rangeSeconds = bestEnd - bestStart;

  // If the detected range covers more than 40% of the video, it's a false
  // positive (sky, light clothing, etc.) — skip it
  if (rangeSeconds / duration > 0.4) return null;

  return {
    start: Math.max(0, bestStart - 0.3),
    end: Math.min(duration, bestEnd + 0.8),
  };
}

async function isCompetitorFrame(framePath: string): Promise<boolean> {
  const { data, info } = await sharp(framePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let lightBlueCount = 0;
  let darkBoxCount = 0;

  // Sample every 4th pixel for speed
  for (let i = 0; i < data.length; i += info.channels * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Tight range around the actual Plug AI blue: #B8DFFB
    // R: 170-200, G: 210-235, B: 240-255
    if (r >= 170 && r <= 200 && g >= 210 && g <= 235 && b >= 240 && b <= 255) {
      lightBlueCount++;
    }

    // Dark chat box area (near-black)
    if (r < 20 && g < 20 && b < 20) {
      darkBoxCount++;
    }
  }

  const sampledPixels = totalPixels / 4;
  const blueRatio = lightBlueCount / sampledPixels;
  const darkRatio = darkBoxCount / sampledPixels;

  // Need >20% light blue background AND >10% dark area (the chat box)
  return blueRatio > 0.2 && darkRatio > 0.1;
}

// ---------------------------------------------------------------------------
// Render the GodText replacement frame with Playwright
// ---------------------------------------------------------------------------

async function renderGodTextFrame(
  jobDir: string,
  width: number,
  height: number,
): Promise<string> {
  const outputPath = path.join(jobDir, "godtext-frame.png");
  const html = buildFrameHtml(width, height);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: "networkidle" });
    await new Promise((r) => setTimeout(r, 500));

    const buffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });
    await fs.writeFile(outputPath, buffer);
    await page.close();
  } finally {
    await browser.close();
  }

  return outputPath;
}

// ---------------------------------------------------------------------------
// Get video dimensions
// ---------------------------------------------------------------------------

async function getVideoDimensions(
  videoPath: string,
): Promise<{ width: number; height: number }> {
  const { stdout } = await execAsync(FFPROBE, [
    "-v", "quiet",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=s=x:p=0",
    videoPath,
  ]);
  const [w, h] = stdout.trim().split("x").map(Number);
  return { width: w || 720, height: h || 1280 };
}

// ---------------------------------------------------------------------------
// Overlay the GodText frame onto the video
// ---------------------------------------------------------------------------

async function overlayFrame(
  videoPath: string,
  framePath: string,
  start: number,
  end: number,
  outputPath: string,
  videoWidth: number,
  videoHeight: number,
): Promise<void> {
  await execAsync(
    FFMPEG,
    [
      "-y",
      "-i", videoPath,
      "-i", framePath,
      "-filter_complex",
      `[1:v]scale=${videoWidth}:${videoHeight}[overlay];[0:v][overlay]overlay=0:0:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[out]`,
      "-map", "[out]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "18",
      "-c:a", "copy",
      outputPath,
    ],
    { maxBuffer: 50 * 1024 * 1024 },
  );
}

// ---------------------------------------------------------------------------
// Upload to Vercel Blob
// ---------------------------------------------------------------------------

async function uploadToBlob(
  filePath: string,
  filename: string,
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const fileBuffer = await fs.readFile(filePath);
  const res = await fetch(`https://blob.vercel-storage.com/${filename}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "video/mp4",
      "x-content-type": "video/mp4",
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blob upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.url;
}

// ---------------------------------------------------------------------------
// Process a single video
// ---------------------------------------------------------------------------

type VideoResult = {
  originalUrl: string;
  status: "success" | "no_competitor_frame" | "error";
  outputUrl?: string;
  frameRange?: { start: number; end: number };
  error?: string;
};

async function processVideo(
  tiktokUrl: string,
  jobDir: string,
  videoIdx: number,
): Promise<VideoResult> {
  const videoDir = path.join(jobDir, `video-${videoIdx}`);
  await fs.mkdir(videoDir, { recursive: true });

  try {
    // 1. Download watermark-free video
    const rawVideoPath = path.join(videoDir, "original.mp4");
    await downloadTikTokNoWatermark(tiktokUrl, rawVideoPath);

    // 2. Get video dimensions
    const { width, height } = await getVideoDimensions(rawVideoPath);

    // 3. Detect competitor frames
    const frameRange = await detectCompetitorFrames(rawVideoPath, videoDir);
    if (!frameRange) {
      return {
        originalUrl: tiktokUrl,
        status: "no_competitor_frame",
      };
    }

    // 4. Render GodText replacement frame at video dimensions
    const godtextFramePath = await renderGodTextFrame(videoDir, width, height);

    // 5. Overlay the GodText frame
    const outputPath = path.join(videoDir, "rebranded.mp4");
    await overlayFrame(
      rawVideoPath,
      godtextFramePath,
      frameRange.start,
      frameRange.end,
      outputPath,
      width,
      height,
    );

    // 6. Upload to Vercel Blob
    const blobFilename = `godtext-rebranded/${Date.now()}-${videoIdx}.mp4`;
    const outputUrl = await uploadToBlob(outputPath, blobFilename);

    return {
      originalUrl: tiktokUrl,
      status: "success",
      outputUrl,
      frameRange,
    };
  } catch (err) {
    return {
      originalUrl: tiktokUrl,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// POST /api/godtext/videos/rebrand
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const jobDir = path.join("/tmp", `godtext-rebrand-${Date.now()}`);

  try {
    const body = await req.json();
    const { urls } = body as { urls?: string[] };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Provide an array of TikTok URLs" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Cap at 10 videos per batch
    const cleanUrls = urls
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0)
      .slice(0, 10);

    await fs.mkdir(jobDir, { recursive: true });

    // Process videos sequentially to avoid overwhelming the machine
    const results: VideoResult[] = [];
    for (let i = 0; i < cleanUrls.length; i++) {
      const result = await processVideo(cleanUrls[i], jobDir, i);
      results.push(result);
    }

    const succeeded = results.filter((r) => r.status === "success").length;
    const noFrame = results.filter(
      (r) => r.status === "no_competitor_frame",
    ).length;
    const failed = results.filter((r) => r.status === "error").length;

    return NextResponse.json(
      { results, succeeded, noFrame, failed },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Video Rebrand] Error:", msg);
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CORS_HEADERS },
    );
  } finally {
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {
      // non-fatal
    }
  }
}
