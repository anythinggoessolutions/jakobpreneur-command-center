import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const execAsync = promisify(execFile);

const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";
const FRAME_W = 1080;
const FRAME_H = 1920;

const AIRTABLE_API = "https://api.airtable.com/v0";

function airtableHeaders() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchRandomMusicUrl(): Promise<string | null> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return null;
  const url = new URL(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Music")}`,
  );
  const res = await fetch(url.toString(), {
    headers: airtableHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const urls = (data.records || [])
    .map(
      (r: { fields: Record<string, unknown> }) =>
        r.fields["Audio URL"] as string,
    )
    .filter(
      (u: unknown): u is string =>
        typeof u === "string" && (u as string).length > 0,
    );
  if (urls.length === 0) return null;
  return urls[Math.floor(Math.random() * urls.length)];
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${url}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(dest, buffer);
}

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

type ConversationMsg = {
  sender: "man" | "woman";
  text: string;
};

type Conversation = {
  hookText: string;
  platform: string;
  messages: ConversationMsg[];
};

// Estimate how long the typing animation will take so Playwright records enough
function estimateDuration(conversation: Conversation): number {
  let duration = 0;
  // Hook frame
  if (conversation.hookText) duration += 2.5;

  for (const msg of conversation.messages) {
    if (msg.sender === "woman") {
      // Typing indicator + appear
      duration += 1.2 + 0.4;
    } else {
      // Character-by-character typing + send pause
      const charTime = msg.text.length * 0.065; // ~65ms avg per char
      duration += charTime + 0.45 + 0.4;
    }
  }
  // Final hold
  duration += 1.5;
  // Add buffer for animation variance
  duration += 3;
  return Math.ceil(duration);
}

// CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const jobDir = path.join("/tmp", `godtext-typing-${Date.now()}`);

  try {
    const body = await req.json();
    const { conversation } = body as { conversation?: Conversation };

    if (!conversation?.messages?.length) {
      return NextResponse.json(
        { error: "Valid conversation with messages required" },
        { status: 400 },
      );
    }

    await fs.mkdir(jobDir, { recursive: true });

    const estimatedSec = estimateDuration(conversation);
    console.log(
      `[Typing Build] ${conversation.messages.length} messages, est ${estimatedSec}s`,
    );

    // Fetch music in parallel with browser setup
    const [musicUrl] = await Promise.all([fetchRandomMusicUrl()]);
    let musicPath: string | null = null;
    if (musicUrl) {
      musicPath = path.join(jobDir, "music.mp3");
      try {
        await downloadFile(musicUrl, musicPath);
      } catch {
        musicPath = null;
      }
    }

    // Warm up the render page
    const baseUrl = "http://localhost:3000";
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch(
          `${baseUrl}/godtext-ai/render?type=hook&hook=warmup`,
        );
        if (res.ok) break;
      } catch {
        // Dev server not ready yet
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Build the render URL with all conversation data
    const renderUrl = new URL("/godtext-ai/render", baseUrl);
    renderUrl.searchParams.set("type", "typing");
    renderUrl.searchParams.set("messages", JSON.stringify(conversation.messages));
    renderUrl.searchParams.set("platform", conversation.platform || "iMessage");
    if (conversation.hookText) {
      renderUrl.searchParams.set("hook", conversation.hookText);
    }

    // Launch Playwright with video recording
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pw = require("playwright") as typeof import("playwright");
    const browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: FRAME_W, height: FRAME_H },
      recordVideo: {
        dir: jobDir,
        size: { width: FRAME_W, height: FRAME_H },
      },
    });
    const page = await context.newPage();

    // Navigate to the typing simulation
    await page.goto(renderUrl.toString(), {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log("[Typing Build] Recording animation...");

    // Wait for the animation to complete.
    // The component sets window.__typingDone = true when finished.
    // Poll for it, with a timeout based on estimated duration.
    const maxWaitMs = (estimatedSec + 10) * 1000;
    const startTime = Date.now();
    let done = false;

    while (Date.now() - startTime < maxWaitMs) {
      done = await page.evaluate(
        "!!window.__typingDone",
      ) as boolean;
      if (done) break;
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!done) {
      console.log("[Typing Build] Animation didn't signal done, using timeout");
    }

    // Small pause after completion for clean ending
    await new Promise((r) => setTimeout(r, 1000));

    // Close page and context to finalize the video
    await page.close();
    await context.close();
    await browser.close();

    // Find the recorded webm file
    const files = await fs.readdir(jobDir);
    const webmFile = files.find((f) => f.endsWith(".webm"));
    if (!webmFile) throw new Error("No video recorded");

    const rawVideoPath = path.join(jobDir, webmFile);
    const outputPath = path.join(jobDir, "typing-video.mp4");

    // Convert webm to mp4 and ensure correct dimensions
    if (musicPath) {
      // Get video duration for music mixing
      const probeResult = await execAsync(FFPROBE, [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        rawVideoPath,
      ]);
      const videoDur = parseFloat(probeResult.stdout.trim()) || 30;
      const fadeOutStart = Math.max(0, videoDur - 2);

      await execAsync(
        FFMPEG,
        [
          "-y",
          "-i", rawVideoPath,
          "-stream_loop", "-1",
          "-i", musicPath,
          "-t", String(videoDur),
          "-filter_complex",
          `[0:v]scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black,fps=30[v];` +
          `[1:a]atrim=0:${videoDur},volume=1.0,afade=t=in:d=1,afade=t=out:st=${fadeOutStart}:d=2[music]`,
          "-map", "[v]",
          "-map", "[music]",
          "-c:v", "libx264", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-ar", "44100",
          "-preset", "fast", "-crf", "18",
          outputPath,
        ],
        { timeout: 120000 },
      );
    } else {
      // No music — just convert to mp4
      await execAsync(
        FFMPEG,
        [
          "-y",
          "-i", rawVideoPath,
          "-vf", `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black,fps=30`,
          "-c:v", "libx264", "-pix_fmt", "yuv420p",
          "-an",
          "-preset", "fast", "-crf", "18",
          outputPath,
        ],
        { timeout: 120000 },
      );
    }

    // Upload to Vercel Blob
    const filename = `godtext-typing/${path.basename(outputPath)}`;
    const blobUrl = await uploadToBlob(outputPath, filename);

    console.log("[Typing Build] Done:", blobUrl);

    return NextResponse.json(
      { videoUrl: blobUrl },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Typing Build] Error:", msg);
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
