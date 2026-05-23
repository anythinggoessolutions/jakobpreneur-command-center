/**
 * GodText AI — Video Assembly Pipeline
 *
 * Takes a generated conversation script and produces a 1080x1920 MP4:
 *
 *   1.  Hook frame     — 2.5s title card with the hook text
 *   2.  Phone beats    — conversation messages appear one by one (~2s each)
 *   3.  Cooking beats  — GodText AI cooking screen at show_godtext_ui moments
 *       (3 loading steps + 1 reveal = 4 frames, ~1s each = ~4s total)
 *   4.  Hype clips     — spliced at high/maximum escalation woman messages
 *   5.  Music layer    — random track from the Music Vault at 15% volume
 *
 * Dependencies:
 *   - Playwright (headless Chromium for screenshotting React components)
 *   - FFmpeg (ffmpeg-full via Homebrew, already installed)
 *   - sharp (already installed — used for image verification/resizing)
 *
 * This module runs LOCAL ONLY — never on Vercel. The API route guards
 * against accidental serverless invocation.
 */

import { execFile } from "child_process";
import { promises as fs } from "fs";
import { createRequire } from "module";
import path from "path";
import { promisify } from "util";
import type { GodTextConversation } from "./godtext-script-generator";

const exec = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VideoTheme = "white" | "dark";

export interface AssemblyInput {
  /** The generated conversation script. */
  conversation: GodTextConversation;
  /** Which cooking-screen theme to use. */
  theme?: VideoTheme;
  /** Vercel Blob URLs for hype clips (pre-fetched from the vault). */
  hypeClipUrls?: { url: string; clipType: string; escalation: string }[];
  /** Vercel Blob URL for the background music track. */
  musicUrl?: string;
  /** Base URL of the running Next.js dev server (default: http://localhost:3000). */
  baseUrl?: string;
}

export interface AssemblyResult {
  /** Absolute path to the finished MP4. */
  outputPath: string;
  /** Total duration in seconds. */
  durationSeconds: number;
  /** Number of frames rendered. */
  frameCount: number;
  /** Errors/warnings encountered (non-fatal). */
  warnings: string[];
}

/** A single segment in the video timeline. */
type Segment =
  | { kind: "image"; path: string; duration: number }
  | { kind: "video"; path: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAME_W = 1080;
const FRAME_H = 1920;
const FPS = 30;

/** Timing (seconds) for each beat type. */
const TIMING = {
  hook: 2.5,
  message: 1.8,
  cookingStep: 1.0, // × 3 steps
  reveal: 2.0,
  hypeClip: -1, // use clip's natural duration
} as const;

const WORK_DIR = path.join(process.cwd(), ".godtext-work");
const OUTPUT_DIR = path.join(process.cwd(), "..", "output", "godtext");

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function assembleVideo(
  input: AssemblyInput,
): Promise<AssemblyResult> {
  const warnings: string[] = [];
  const baseUrl = input.baseUrl || "http://localhost:3000";
  const theme = input.theme || "dark";
  const jobId = `gt-${Date.now()}`;
  const jobDir = path.join(WORK_DIR, jobId);

  await fs.mkdir(jobDir, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // ------- Step 1: Launch Playwright -------
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;

  try {
    browser = await launchBrowser();
    const page: PlaywrightPage = await browser.newPage();
    await page.setViewportSize({ width: FRAME_W, height: FRAME_H });

    // ------- Step 2: Render all frames -------
    const segments: Segment[] = [];
    let frameIdx = 0;

    // 2a. Hook frame
    const hookPath = path.join(jobDir, `frame-${String(frameIdx).padStart(4, "0")}-hook.png`);
    await screenshotFrame(page, baseUrl, hookPath, {
      type: "hook",
      hook: input.conversation.hookText,
    });
    segments.push({ kind: "image", path: hookPath, duration: TIMING.hook });
    frameIdx++;

    // 2b. Walk through conversation messages
    const visibleMessages: { sender: string; text: string }[] = [];

    for (let i = 0; i < input.conversation.messages.length; i++) {
      const msg = input.conversation.messages[i];

      // If this man message has show_godtext_ui, render the cooking sequence
      // BEFORE showing his message land in the chat.
      if (msg.sender === "man" && msg.show_godtext_ui) {
        // Cooking steps (3 frames)
        for (let step = 0; step < 3; step++) {
          const cookPath = path.join(
            jobDir,
            `frame-${String(frameIdx).padStart(4, "0")}-cook-${step}.png`,
          );
          await screenshotFrame(page, baseUrl, cookPath, {
            type: "cooking",
            theme,
            phase: "cooking",
            step: String(step),
          });
          segments.push({ kind: "image", path: cookPath, duration: TIMING.cookingStep });
          frameIdx++;
        }

        // Reveal frame
        const revealPath = path.join(
          jobDir,
          `frame-${String(frameIdx).padStart(4, "0")}-reveal.png`,
        );
        await screenshotFrame(page, baseUrl, revealPath, {
          type: "cooking",
          theme,
          phase: "reveal",
        });
        segments.push({ kind: "image", path: revealPath, duration: TIMING.reveal });
        frameIdx++;
      }

      // Add message to visible stack and render the phone screen
      visibleMessages.push({ sender: msg.sender, text: msg.text });
      const phonePath = path.join(
        jobDir,
        `frame-${String(frameIdx).padStart(4, "0")}-phone.png`,
      );
      await screenshotFrame(page, baseUrl, phonePath, {
        type: "phone",
        platform: input.conversation.platform,
        messages: JSON.stringify(visibleMessages),
      });
      segments.push({ kind: "image", path: phonePath, duration: TIMING.message });
      frameIdx++;

      // If woman message with high/maximum escalation, splice a hype clip
      if (
        msg.sender === "woman" &&
        (msg.escalation_level === "high" || msg.escalation_level === "maximum") &&
        input.hypeClipUrls &&
        input.hypeClipUrls.length > 0
      ) {
        try {
          const clip = pickHypeClip(input.hypeClipUrls, msg.escalation_level);
          if (clip) {
            const clipPath = path.join(jobDir, `clip-${frameIdx}.mp4`);
            await downloadFile(clip.url, clipPath);
            segments.push({ kind: "video", path: clipPath });
            frameIdx++;
          }
        } catch (err) {
          warnings.push(
            `Failed to download hype clip: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    await page.close();
    await browser.close();
    browser = null;

    // ------- Step 3: Download music -------
    let musicPath: string | null = null;
    if (input.musicUrl) {
      musicPath = path.join(jobDir, "music.mp3");
      try {
        await downloadFile(input.musicUrl, musicPath);
      } catch (err) {
        warnings.push(
          `Failed to download music: ${err instanceof Error ? err.message : String(err)}`,
        );
        musicPath = null;
      }
    }

    // ------- Step 4: FFmpeg assembly -------
    const outputPath = path.join(
      OUTPUT_DIR,
      `godtext-${input.conversation.platform.toLowerCase()}-${jobId}.mp4`,
    );

    const durationSeconds = await ffmpegAssemble(
      segments,
      musicPath,
      outputPath,
      jobDir,
    );

    return {
      outputPath,
      durationSeconds,
      frameCount: frameIdx,
      warnings,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore cleanup errors
      }
    }
    // Clean up work directory
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {
      // non-fatal
    }
  }
}

// ---------------------------------------------------------------------------
// Playwright helpers
// ---------------------------------------------------------------------------

// Playwright module name split so Turbopack can't statically resolve it
// at build time — the module is only needed when running locally.
const PW_MODULE = ["play", "wright"].join("");

async function launchBrowser() {
  const nodeRequire = createRequire(import.meta.url);
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

/** Minimal type for the Playwright page object we use. */
type PlaywrightPage = {
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  goto: (url: string, opts?: { waitUntil?: string }) => Promise<unknown>;
  screenshot: (opts: {
    type?: string;
    clip?: { x: number; y: number; width: number; height: number };
  }) => Promise<Buffer>;
  close: () => Promise<void>;
};

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

  await page.goto(url.toString(), { waitUntil: "networkidle" });
  // Small delay for font rendering
  await new Promise((r) => setTimeout(r, 500));

  const buffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: FRAME_W, height: FRAME_H },
  });
  await fs.writeFile(outputPath, buffer);
}

// ---------------------------------------------------------------------------
// FFmpeg assembly
// ---------------------------------------------------------------------------

async function ffmpegAssemble(
  segments: Segment[],
  musicPath: string | null,
  outputPath: string,
  jobDir: string,
): Promise<number> {
  // Strategy: build a concat-demuxer file. Image segments become short
  // videos first (ffmpeg -loop 1 -t <dur>), then everything is concatenated,
  // and music is mixed in as the final step.

  const segmentVideos: string[] = [];
  let segIdx = 0;

  for (const seg of segments) {
    const outVid = path.join(jobDir, `seg-${String(segIdx).padStart(4, "0")}.mp4`);
    if (seg.kind === "image") {
      // Convert still image to a short video clip with silent audio
      // (all segments need matching audio tracks for concat to work)
      await exec("ffmpeg", [
        "-y",
        "-loop", "1",
        "-i", seg.path,
        "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=stereo",
        "-t", String(seg.duration),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", String(FPS),
        "-vf", `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-shortest",
        "-preset", "fast",
        "-crf", "18",
        outVid,
      ]);
    } else {
      // Re-encode the hype clip to match our format. Strip original
      // audio and add silence — the background music track gets mixed
      // in at the final concat step.
      await exec("ffmpeg", [
        "-y",
        "-i", seg.path,
        "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=stereo",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", String(FPS),
        "-vf", `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-shortest",
        "-preset", "fast",
        "-crf", "18",
        outVid,
      ]);
    }
    segmentVideos.push(outVid);
    segIdx++;
  }

  // Build concat list
  const concatList = path.join(jobDir, "concat.txt");
  const concatContent = segmentVideos
    .map((p) => `file '${p}'`)
    .join("\n");
  await fs.writeFile(concatList, concatContent);

  // Concatenate all segments
  const rawConcat = path.join(jobDir, "raw-concat.mp4");
  await exec("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatList,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "fast",
    "-crf", "18",
    rawConcat,
  ]);

  if (musicPath) {
    // Mix music at 15% volume with 1s fade-in and 2s fade-out.
    // Get video duration first.
    const probeResult = await exec("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      rawConcat,
    ]);
    const videoDur = parseFloat(probeResult.stdout.trim()) || 30;
    const fadeOutStart = Math.max(0, videoDur - 2);

    // Replace the silent audio in the concat with the music track.
    // Music plays at 15% volume with 1s fade-in and 2s fade-out,
    // looped if shorter than the video.
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
    // No music — the concat already has silent audio, just copy through.
    await exec("ffmpeg", [
      "-y",
      "-i", rawConcat,
      "-c", "copy",
      outputPath,
    ], { timeout: 120000 });
  }

  // Get final duration
  const finalProbe = await exec("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    outputPath,
  ]);

  return parseFloat(finalProbe.stdout.trim()) || 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickHypeClip(
  clips: { url: string; clipType: string; escalation: string }[],
  escalation: string,
): { url: string; clipType: string } | null {
  // Prefer memes for "high", hype clips for "maximum", but fall back randomly
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
