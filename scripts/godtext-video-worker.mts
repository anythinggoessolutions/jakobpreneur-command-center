#!/usr/bin/env node
/**
 * GodText Video Worker
 *
 * Runs locally on the Mac. Polls Airtable for queued video jobs,
 * builds them with Playwright + FFmpeg, uploads the MP4 to Vercel
 * Blob, and updates the Airtable record.
 *
 * Usage:  npm run godtext-worker
 *
 * Requires .env.local with:
 *   AIRTABLE_API_KEY, AIRTABLE_BASE_ID, BLOB_READ_WRITE_TOKEN
 */

import { execFile } from "child_process";
import { promises as fs } from "fs";
import { createRequire } from "module";
import path from "path";
import { promisify } from "util";

const exec = promisify(execFile);

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const PROJECT_ROOT = path.resolve(
  new URL(".", import.meta.url).pathname,
  "..",
);

const envPath = path.join(PROJECT_ROOT, ".env.local");
try {
  const envContent = await fs.readFile(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error("⚠️  Could not read .env.local — make sure it exists");
  process.exit(1);
}

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !BLOB_TOKEN) {
  console.error(
    "❌ Missing required env vars: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, BLOB_READ_WRITE_TOKEN",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const AIRTABLE_API = "https://api.airtable.com/v0";
const TABLE = "GodText Video Jobs";
const POLL_INTERVAL = 5_000; // 5 seconds

const FRAME_W = 1080;
const FRAME_H = 1920;
const FPS = 30;
const TIMING = {
  hook: 2.5,
  message: 1.8,
  cookingStep: 1.0,
  reply: 2.0,
};

const WORK_DIR = path.join(PROJECT_ROOT, ".godtext-work");

// ---------------------------------------------------------------------------
// Airtable helpers
// ---------------------------------------------------------------------------

type JobRecord = {
  id: string;
  fields: {
    Status?: string;
    "Conversation JSON"?: string;
    Theme?: string;
    "Video URL"?: string;
    Error?: string;
  };
};

function airtableHeaders() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchQueuedJobs(): Promise<JobRecord[]> {
  const url = new URL(
    `${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}`,
  );
  url.searchParams.set(
    "filterByFormula",
    `{Status} = "queued"`,
  );
  url.searchParams.set("pageSize", "1");

  const res = await fetch(url.toString(), {
    headers: airtableHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status}`);
  const data = await res.json();
  return data.records || [];
}

async function updateJob(
  id: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(
    `${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}/${id}`,
    {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields, typecast: true }),
    },
  );
  if (!res.ok) throw new Error(`Airtable update failed: ${res.status}`);
}

// ---------------------------------------------------------------------------
// Vercel Blob upload
// ---------------------------------------------------------------------------

async function uploadToBlob(
  filePath: string,
  filename: string,
): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);

  // Use the Vercel Blob REST API directly
  const res = await fetch(
    `https://blob.vercel-storage.com/${filename}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BLOB_TOKEN}`,
        "Content-Type": "video/mp4",
        "x-content-type": "video/mp4",
      },
      body: fileBuffer,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blob upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.url;
}

// ---------------------------------------------------------------------------
// Playwright helpers
// ---------------------------------------------------------------------------

const PW_MODULE = ["play", "wright"].join("");

type PlaywrightPage = {
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
  screenshot: (opts: {
    type?: string;
    clip?: { x: number; y: number; width: number; height: number };
  }) => Promise<Buffer>;
  evaluate: (expr: string) => Promise<unknown>;
  close: () => Promise<void>;
};

async function launchBrowser() {
  const nodeRequire = createRequire(
    path.join(PROJECT_ROOT, "__pw__.js"),
  );
  const pw = nodeRequire(PW_MODULE) as {
    chromium: {
      launch: (opts: { headless: boolean }) => Promise<{
        newPage: () => Promise<PlaywrightPage>;
        close: () => Promise<void>;
      }>;
    };
  };
  return pw.chromium.launch({ headless: true });
}

async function screenshotFrame(
  page: PlaywrightPage,
  baseUrl: string,
  outputPath: string,
  params: Record<string, string>,
) {
  const url = new URL("/godtext-ai/render", baseUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  await page.goto(url.toString(), { waitUntil: "networkidle", timeout: 60000 });

  // Verify the page rendered correctly (not a Next.js error overlay)
  const hasError = await page.evaluate(
    `document.querySelector('[data-nextjs-dialog-overlay]') !== null || document.body.innerText.includes('Runtime Error')`,
  );
  if (hasError) {
    throw new Error(`Render page showed an error for: ${url.searchParams.toString()}`);
  }

  await new Promise((r) => setTimeout(r, 500));
  const buffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: FRAME_W, height: FRAME_H },
  });
  await fs.writeFile(outputPath, buffer);
}

// ---------------------------------------------------------------------------
// Video assembly (mirrors godtext-video-assembler.ts logic)
// ---------------------------------------------------------------------------

type Segment =
  | { kind: "image"; path: string; duration: number }
  | { kind: "video"; path: string };

type ConversationMsg = {
  sender: "man" | "woman";
  text: string;
  show_godtext_ui?: boolean;
  escalation_level?: string;
};

type Conversation = {
  platform: string;
  hookText: string;
  womanName?: string;
  messages: ConversationMsg[];
};

async function warmUpRenderPage(baseUrl: string): Promise<void> {
  // Hit the render page via HTTP first so Turbopack compiles it.
  // Playwright will timeout on error pages if the page isn't ready.
  console.log("   Warming up render page...");
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/godtext-ai/render?type=hook&hook=warmup`);
      if (res.ok) {
        console.log("   Render page ready ✓");
        return;
      }
      console.log(`   Render page returned ${res.status}, retrying...`);
    } catch {
      console.log(`   Dev server not responding, retrying in 3s...`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Render page failed to compile after 10 attempts. Is 'npm run dev' running?");
}

// ---------------------------------------------------------------------------
// Airtable vault fetchers
// ---------------------------------------------------------------------------

type HypeClip = { url: string; clipType: string };

async function fetchHypeClips(): Promise<HypeClip[]> {
  const url = new URL(
    `${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${encodeURIComponent("GodText Hype Clips")}`,
  );
  const res = await fetch(url.toString(), {
    headers: airtableHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records || [])
    .filter((r: { fields: Record<string, unknown> }) => r.fields["Video URL"])
    .map((r: { fields: Record<string, unknown> }) => ({
      url: r.fields["Video URL"] as string,
      clipType: (r.fields["Clip Type"] as string) || "Hype Clip",
    }));
}

async function fetchRandomMusicUrl(): Promise<string | null> {
  const url = new URL(
    `${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${encodeURIComponent("GodText Music")}`,
  );
  const res = await fetch(url.toString(), {
    headers: airtableHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const urls = (data.records || [])
    .map((r: { fields: Record<string, unknown> }) => r.fields["Audio URL"] as string)
    .filter((u: unknown): u is string => typeof u === "string" && (u as string).length > 0);
  if (urls.length === 0) return null;
  return urls[Math.floor(Math.random() * urls.length)];
}

function pickHypeClip(
  clips: HypeClip[],
  escalation: string,
): HypeClip | null {
  const preferred =
    escalation === "maximum"
      ? clips.filter((c) => c.clipType === "Hype Clip")
      : clips.filter((c) => c.clipType === "Meme");
  const pool = preferred.length > 0 ? preferred : clips;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${url}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(dest, buffer);
}

// ---------------------------------------------------------------------------
// Video builder
// ---------------------------------------------------------------------------

async function buildVideo(
  conversation: Conversation,
  theme: string,
  jobDir: string,
): Promise<string> {
  const baseUrl = "http://localhost:3000";

  // Fetch hype clips and music from the vaults
  console.log("   Fetching hype clips and music from vaults...");
  const [hypeClips, musicUrl] = await Promise.all([
    fetchHypeClips(),
    fetchRandomMusicUrl(),
  ]);
  console.log(`   Found ${hypeClips.length} hype clips, music: ${musicUrl ? "yes" : "none"}`);

  // Download music if available
  let musicPath: string | null = null;
  if (musicUrl) {
    musicPath = path.join(jobDir, "music.mp3");
    try {
      await downloadFile(musicUrl, musicPath);
      console.log("   Music downloaded ✓");
    } catch (err) {
      console.log(`   Music download failed: ${err instanceof Error ? err.message : String(err)}`);
      musicPath = null;
    }
  }

  // Make sure the render page is compiled before launching Playwright
  await warmUpRenderPage(baseUrl);

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width: FRAME_W, height: FRAME_H });

  const segments: Segment[] = [];
  let frameIdx = 0;

  // Hook frame
  const hookPath = path.join(jobDir, `frame-${pad(frameIdx)}-hook.png`);
  await screenshotFrame(page, baseUrl, hookPath, {
    type: "hook",
    hook: conversation.hookText,
  });
  segments.push({ kind: "image", path: hookPath, duration: TIMING.hook });
  frameIdx++;

  // Walk through messages
  const visibleMessages: { sender: string; text: string }[] = [];

  for (const msg of conversation.messages) {
    if (msg.sender === "man" && msg.show_godtext_ui) {
      // Cooking steps (3 loading frames)
      for (let step = 0; step < 3; step++) {
        const cookPath = path.join(jobDir, `frame-${pad(frameIdx)}-cook-${step}.png`);
        await screenshotFrame(page, baseUrl, cookPath, {
          type: "cooking",
          theme,
          phase: "cooking",
          step: String(step),
        });
        segments.push({ kind: "image", path: cookPath, duration: TIMING.cookingStep });
        frameIdx++;
      }

      // Reply screen
      const replyPath = path.join(jobDir, `frame-${pad(frameIdx)}-reply.png`);
      await screenshotFrame(page, baseUrl, replyPath, {
        type: "reply",
        reply: msg.text,
        theme,
      });
      segments.push({ kind: "image", path: replyPath, duration: TIMING.reply });
      frameIdx++;
    }

    // Phone screen with this message added
    visibleMessages.push({ sender: msg.sender, text: msg.text });
    const phonePath = path.join(jobDir, `frame-${pad(frameIdx)}-phone.png`);
    await screenshotFrame(page, baseUrl, phonePath, {
      type: "phone",
      platform: conversation.platform,
      messages: JSON.stringify(visibleMessages),
      ...(conversation.womanName ? { womanName: conversation.womanName } : {}),
    });
    segments.push({ kind: "image", path: phonePath, duration: TIMING.message });
    frameIdx++;

    // Splice a hype clip after high/maximum escalation woman messages
    if (
      msg.sender === "woman" &&
      (msg.escalation_level === "high" || msg.escalation_level === "maximum") &&
      hypeClips.length > 0
    ) {
      try {
        const clip = pickHypeClip(hypeClips, msg.escalation_level);
        if (clip) {
          const clipPath = path.join(jobDir, `clip-${frameIdx}.mp4`);
          await downloadFile(clip.url, clipPath);
          segments.push({ kind: "video", path: clipPath });
          frameIdx++;
          console.log(`   Spliced hype clip (${clip.clipType}) after "${msg.text.slice(0, 30)}..."`);
        }
      } catch (err) {
        console.log(`   Hype clip download failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  await page.close();
  await browser.close();

  // FFmpeg assembly
  const outputPath = path.join(
    jobDir,
    `godtext-${conversation.platform.toLowerCase()}-${Date.now()}.mp4`,
  );
  await ffmpegAssemble(segments, musicPath, outputPath, jobDir);

  return outputPath;
}

async function ffmpegAssemble(
  segments: Segment[],
  musicPath: string | null,
  outputPath: string,
  jobDir: string,
): Promise<void> {
  const segmentVideos: string[] = [];
  let segIdx = 0;

  for (const seg of segments) {
    const outVid = path.join(jobDir, `seg-${pad(segIdx)}.mp4`);
    if (seg.kind === "image") {
      await exec("ffmpeg", [
        "-y", "-loop", "1", "-i", seg.path,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-t", String(seg.duration),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-vf", `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
        "-shortest", "-preset", "fast", "-crf", "18",
        outVid,
      ]);
    } else {
      await exec("ffmpeg", [
        "-y", "-i", seg.path,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-vf", `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
        "-shortest", "-preset", "fast", "-crf", "18",
        outVid,
      ]);
    }
    segmentVideos.push(outVid);
    segIdx++;
  }

  // Concat all segments
  const concatList = path.join(jobDir, "concat.txt");
  await fs.writeFile(
    concatList,
    segmentVideos.map((p) => `file '${p}'`).join("\n"),
  );

  const rawConcat = path.join(jobDir, "raw-concat.mp4");
  await exec("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", concatList,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-ar", "44100",
    "-preset", "fast", "-crf", "18",
    rawConcat,
  ]);

  if (musicPath) {
    // Mix music at 15% volume with 1s fade-in and 2s fade-out
    const probeResult = await exec("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      rawConcat,
    ]);
    const videoDur = parseFloat(probeResult.stdout.trim()) || 30;
    const fadeOutStart = Math.max(0, videoDur - 2);

    console.log(`   Mixing music at 15% volume (${videoDur.toFixed(1)}s video)`);

    await exec("ffmpeg", [
      "-y",
      "-i", rawConcat,
      "-stream_loop", "-1",
      "-i", musicPath,
      "-t", String(videoDur),
      "-filter_complex",
      `[1:a]atrim=0:${videoDur},volume=0.15,afade=t=in:d=1,afade=t=out:st=${fadeOutStart}:d=2[music]`,
      "-map", "0:v",
      "-map", "[music]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-ar", "44100",
      outputPath,
    ], { timeout: 120000 });
  } else {
    // No music — just rename the concat
    await fs.rename(rawConcat, outputPath);
  }
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------

async function processJob(job: JobRecord): Promise<void> {
  const jobId = job.id;
  const theme = job.fields.Theme || "dark";
  let conversation: Conversation;

  try {
    conversation = JSON.parse(job.fields["Conversation JSON"] || "{}");
  } catch {
    await updateJob(jobId, { Status: "failed", Error: "Invalid conversation JSON" });
    return;
  }

  if (!conversation.messages || !conversation.platform) {
    await updateJob(jobId, {
      Status: "failed",
      Error: "Conversation missing messages or platform",
    });
    return;
  }

  // Mark as processing
  await updateJob(jobId, { Status: "processing" });
  console.log(`⚡ Processing job ${jobId} (${conversation.platform}, ${theme} theme)`);

  const jobDir = path.join(WORK_DIR, `job-${Date.now()}`);
  await fs.mkdir(jobDir, { recursive: true });

  try {
    // Build video
    const videoPath = await buildVideo(conversation, theme, jobDir);
    console.log(`🎬 Video built: ${videoPath}`);

    // Upload to Vercel Blob
    const filename = `godtext-videos/${path.basename(videoPath)}`;
    const blobUrl = await uploadToBlob(videoPath, filename);
    console.log(`☁️  Uploaded to Blob: ${blobUrl}`);

    // Update Airtable
    await updateJob(jobId, {
      Status: "complete",
      "Video URL": blobUrl,
    });
    console.log(`✅ Job ${jobId} complete!`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Job ${jobId} failed:`, msg);
    await updateJob(jobId, { Status: "failed", Error: msg });
  } finally {
    // Clean up work dir
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {
      // non-fatal
    }
  }
}

async function pollOnce(): Promise<void> {
  try {
    const jobs = await fetchQueuedJobs();
    if (jobs.length > 0) {
      await processJob(jobs[0]);
    }
  } catch (err) {
    console.error(
      "Poll error:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

console.log("🎥 GodText Video Worker started");
console.log(`   Polling Airtable every ${POLL_INTERVAL / 1000}s for queued jobs`);
console.log(`   Make sure 'npm run dev' is running on localhost:3000\n`);

// Run immediately, then on interval
await pollOnce();
setInterval(pollOnce, POLL_INTERVAL);
