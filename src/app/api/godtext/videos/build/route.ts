import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { generateCommentaryAudio } from "@/lib/elevenlabs-tts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// No timeout for local dev — video builds can take 1-3 minutes
export const maxDuration = 300;

const execAsync = promisify(execFile);

// Absolute paths — Node child processes launched via LaunchAgent / auto-start
// don't inherit the user's shell PATH, so /opt/homebrew/bin isn't available.
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";

const FRAME_W = 1080;
const FRAME_H = 1920;
const FPS = 30;
const TIMING = {
  hook: 2.5,
  message: 1.5,
  cookingStep: 1.0,
  reply: 2.0,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Segment =
  | { kind: "image"; path: string; duration: number; commentaryAudio?: string }
  | { kind: "video"; path: string; commentaryAudio?: string };

type ConversationMsg = {
  sender: "man" | "woman";
  text: string;
  show_godtext_ui?: boolean;
  escalation_level?: string;
  commentary?: string;
};

type Conversation = {
  platform: string;
  hookText: string;
  hookVoiceover?: string;
  womanName?: string;
  messages: ConversationMsg[];
};

// ---------------------------------------------------------------------------
// Airtable vault fetchers
// ---------------------------------------------------------------------------

const AIRTABLE_API = "https://api.airtable.com/v0";

function airtableHeaders() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

type HypeClip = { url: string; clipType: string };

async function fetchHypeClips(): Promise<HypeClip[]> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return [];
  const url = new URL(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Hype Clips")}`,
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

async function fetchHookBackgrounds(): Promise<string[]> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return [];
  const url = new URL(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Hook Backgrounds")}`,
  );
  const res = await fetch(url.toString(), {
    headers: airtableHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records || [])
    .filter((r: { fields: Record<string, unknown> }) => r.fields["Video URL"])
    .map((r: { fields: Record<string, unknown> }) => r.fields["Video URL"] as string);
}

type BaddiePhoto = { id: string; url: string };

async function fetchUnusedBaddiePhotos(): Promise<BaddiePhoto[]> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return [];
  const url = new URL(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Baddie Photos")}`,
  );
  // Only fetch photos that haven't been used yet
  url.searchParams.set(
    "filterByFormula",
    'OR({Used Count} = 0, {Used Count} = BLANK())',
  );
  const res = await fetch(url.toString(), {
    headers: airtableHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.records || [])
    .filter((r: { id: string; fields: Record<string, unknown> }) => r.fields["Image URL"])
    .map((r: { id: string; fields: Record<string, unknown> }) => ({
      id: r.id,
      url: r.fields["Image URL"] as string,
    }));
}

async function markBaddieUsed(recordId: string): Promise<void> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return;
  await fetch(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Baddie Photos")}/${recordId}`,
    {
      method: "PATCH",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields: { "Used Count": 1 } }),
    },
  );
}

async function fetchIntroAudioUrl(): Promise<string | null> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return null;
  const url = new URL(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Intro Audio")}`,
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
  // Use the first (most recent) intro audio — there should typically be just one.
  return urls.length > 0 ? urls[0] : null;
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

function pickHypeClip(
  clips: HypeClip[],
  escalation: string,
  usedUrls: Set<string>,
): HypeClip | null {
  // "maximum" (final woman message) → always a Hype Clip (animated GIF/video)
  // everything else → 50/50 random between Meme and Hype Clip
  let preferred: HypeClip[];
  if (escalation === "maximum") {
    preferred = clips.filter((c) => c.clipType === "Hype Clip");
  } else {
    // 50/50 coin flip between meme and hype clip
    const wantMeme = Math.random() < 0.5;
    preferred = clips.filter((c) =>
      wantMeme ? c.clipType === "Meme" : c.clipType === "Hype Clip",
    );
  }
  const pool = preferred.length > 0 ? preferred : clips;

  // Filter out already-used clips this build so we get variety
  const available = pool.filter((c) => !usedUrls.has(c.url));
  const finalPool = available.length > 0 ? available : pool; // fallback to repeats if exhausted
  if (finalPool.length === 0) return null;

  const pick = finalPool[Math.floor(Math.random() * finalPool.length)];
  usedUrls.add(pick.url);
  return pick;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${url}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(dest, buffer);
}

// ---------------------------------------------------------------------------
// Vercel Blob upload
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
// Playwright helpers
// ---------------------------------------------------------------------------

type PlaywrightPage = {
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  goto: (
    url: string,
    opts?: { waitUntil?: string; timeout?: number },
  ) => Promise<unknown>;
  screenshot: (opts: {
    type?: string;
    clip?: { x: number; y: number; width: number; height: number };
  }) => Promise<Buffer>;
  evaluate: (expr: string) => Promise<unknown>;
  close: () => Promise<void>;
};

async function launchBrowser() {
  // Dynamic import — Playwright is a devDependency and only available locally
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
      "Playwright not available. Video building only works locally with npm run dev.",
    );
  }
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
  await page.goto(url.toString(), {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  const hasError = await page.evaluate(
    `document.querySelector('[data-nextjs-dialog-overlay]') !== null || document.body.innerText.includes('Runtime Error')`,
  );
  if (hasError) {
    throw new Error(
      `Render page error for: ${url.searchParams.toString()}`,
    );
  }

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

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

async function ffmpegAssemble(
  segments: Segment[],
  musicPath: string | null,
  introAudioPath: string | null,
  outputPath: string,
  jobDir: string,
): Promise<void> {
  const segmentVideos: string[] = [];
  let segIdx = 0;

  for (const seg of segments) {
    const outVid = path.join(jobDir, `seg-${pad(segIdx)}.mp4`);
    const hasCommentary = !!seg.commentaryAudio;

    if (seg.kind === "image") {
      if (hasCommentary) {
        // Image segment with commentary voiceover — use commentary audio
        // instead of silence, pad with silence if image is longer than audio
        await execAsync(FFMPEG, [
          "-y", "-loop", "1", "-i", seg.path,
          "-i", seg.commentaryAudio!,
          "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
          "-t", String(seg.duration),
          "-filter_complex",
          `[1:a]aresample=44100,volume=2.5,loudnorm=I=-14:TP=-1:LRA=7,apad=whole_dur=${seg.duration}[vo];` +
            `[vo]atrim=0:${seg.duration}[vopad]`,
          "-map", "0:v", "-map", "[vopad]",
          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
          "-vf",
          `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
          "-c:a", "aac", "-ar", "44100", "-ac", "2",
          "-shortest", "-preset", "fast", "-crf", "18",
          outVid,
        ]);
      } else {
        // Image segment with silence
        await execAsync(FFMPEG, [
          "-y", "-loop", "1", "-i", seg.path,
          "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
          "-t", String(seg.duration),
          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
          "-vf",
          `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
          "-c:a", "aac", "-ar", "44100", "-ac", "2",
          "-shortest", "-preset", "fast", "-crf", "18",
          outVid,
        ]);
      }
    } else if (hasCommentary) {
      // Video segment with hook voiceover — mix commentary audio in
      await execAsync(FFMPEG, [
        "-y", "-i", seg.path,
        "-i", seg.commentaryAudio!,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-filter_complex",
        `[1:a]aresample=44100,volume=2.5,loudnorm=I=-14:TP=-1:LRA=7,apad=whole_dur=30[vo];` +
          `[vo]atrim=0:30[vopad]`,
        "-map", "0:v:0", "-map", "[vopad]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-vf",
        `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
        "-shortest", "-preset", "fast", "-crf", "18",
        outVid,
      ]);
    } else {
      // Video segment — silent
      await execAsync(FFMPEG, [
        "-y", "-i", seg.path,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-vf",
        `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
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
  await execAsync(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", concatList,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-ar", "44100",
    "-preset", "fast", "-crf", "18",
    rawConcat,
  ]);

  // Mix in the GodText intro sound at the very start of the video.
  // The intro plays over the hook frame (~4s), fades out, then silence.
  // Video audio (silent from anullsrc) is preserved so the music step
  // can layer on top without issues.
  let baseVideo = rawConcat;
  if (introAudioPath) {
    try {
      const withIntro = path.join(jobDir, "with-intro.mp4");
      await execAsync(FFMPEG, [
        "-y",
        "-i", rawConcat,
        "-i", introAudioPath,
        "-filter_complex",
        // Boost intro to max volume, NO fade — play the full clip including
        // the gun-cock sound at the end, then cut straight to messages
        "[1:a]volume=3.0,loudnorm=I=-14:TP=-1:LRA=7[intro];" +
          "[0:a][intro]amix=inputs=2:duration=first:dropout_transition=0[a]",
        "-map", "0:v",
        "-map", "[a]",
        "-c:v", "copy",
        "-c:a", "aac", "-ar", "44100",
        withIntro,
      ], { timeout: 60000 });
      baseVideo = withIntro;
    } catch (err) {
      console.warn("[Video Build] Failed to mix intro audio:", err);
    }
  }

  if (musicPath) {
    const probeResult = await execAsync(FFPROBE, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      baseVideo,
    ]);
    const videoDur = parseFloat(probeResult.stdout.trim()) || 30;
    const fadeOutStart = Math.max(0, videoDur - 2);

    await execAsync(
      FFMPEG,
      [
        "-y",
        "-i", baseVideo,
        "-stream_loop", "-1",
        "-i", musicPath,
        "-t", String(videoDur),
        "-filter_complex",
        // Mix existing audio (which now includes intro sound) with background music
        `[1:a]atrim=0:${videoDur},volume=0.20,afade=t=in:d=1,afade=t=out:st=${fadeOutStart}:d=2[music];` +
          `[0:a][music]amix=inputs=2:duration=first:dropout_transition=0[a]`,
        "-map", "0:v",
        "-map", "[a]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-ar", "44100",
        outputPath,
      ],
      { timeout: 120000 },
    );
  } else {
    await fs.rename(baseVideo, outputPath);
  }
}

// ---------------------------------------------------------------------------
// Main build logic
// ---------------------------------------------------------------------------

async function buildVideo(
  conversation: Conversation,
  theme: string,
  jobDir: string,
): Promise<string> {
  // Use the same dev server that's running this API route
  const baseUrl = "http://localhost:3000";

  // Fetch hype clips, music, intro audio, hook backgrounds, and unused baddie photos from vaults
  const [hypeClips, musicUrl, introAudioUrl, hookBgUrls, unusedBaddies] = await Promise.all([
    fetchHypeClips(),
    fetchRandomMusicUrl(),
    fetchIntroAudioUrl(),
    fetchHookBackgrounds(),
    fetchUnusedBaddiePhotos(),
  ]);

  // Download music if available
  let musicPath: string | null = null;
  if (musicUrl) {
    musicPath = path.join(jobDir, "music.mp3");
    try {
      await downloadFile(musicUrl, musicPath);
    } catch {
      musicPath = null;
    }
  }

  // Download intro audio if available
  let introAudioPath: string | null = null;
  if (introAudioUrl) {
    introAudioPath = path.join(jobDir, "intro-audio.mp3");
    try {
      await downloadFile(introAudioUrl, introAudioPath);
    } catch {
      introAudioPath = null;
    }
  }

  // Warm up the render page
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

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width: FRAME_W, height: FRAME_H });

  const segments: Segment[] = [];
  let frameIdx = 0;
  // Track used clips per build so no hype clip repeats in one video
  const usedClipUrls = new Set<string>();

  try {
    // ---------------------------------------------------------------
    // Hook: baddie photo as background with branded hook text overlay.
    // If no baddie available, falls back to hook video or static screen.
    // "this is who we're rizzing today" intro feel — baddie + hook in one shot.
    // ---------------------------------------------------------------
    // Generate hook voiceover TTS if the conversation has one
    let hookVoiceoverPath: string | null = null;
    let hookDuration = 4.0; // default hook frame length
    if (conversation.hookVoiceover) {
      try {
        hookVoiceoverPath = path.join(jobDir, "hook-voiceover.mp3");
        await generateCommentaryAudio(conversation.hookVoiceover, hookVoiceoverPath);
        // Measure the voiceover duration so the hook frame is long enough
        const probeRes = await execAsync(FFPROBE, [
          "-v", "error", "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1", hookVoiceoverPath,
        ]);
        const voDur = parseFloat(probeRes.stdout.trim()) || 0;
        // Hook frame = max of default 4s or voiceover + 0.5s buffer
        hookDuration = Math.max(4.0, voDur + 0.5);
        console.log(`[Video Build] Hook voiceover: ${voDur.toFixed(1)}s → frame ${hookDuration.toFixed(1)}s`);
      } catch (err) {
        console.warn("[Video Build] Failed to generate hook voiceover:", err);
        hookVoiceoverPath = null;
      }
    }

    if (unusedBaddies.length > 0) {
      // Baddie-as-hook: download baddie photo, overlay hook text on it
      const baddie = unusedBaddies[Math.floor(Math.random() * unusedBaddies.length)];
      const baddieDlPath = path.join(jobDir, `baddie-${frameIdx}.jpg`);
      await downloadFile(baddie.url, baddieDlPath);
      await markBaddieUsed(baddie.id);

      // Render hook text overlay — uses the conversation's hookText (trending search terms)
      const hookOverlayPath = path.join(jobDir, `hook-overlay-${frameIdx}.png`);
      await screenshotFrame(page, baseUrl, hookOverlayPath, {
        type: "hook-overlay",
        hook: conversation.hookText || "Texting huzz\n*Take notes*",
      });

      // Compose: baddie photo full-screen (full color) + text overlay
      const hookFramePath = path.join(jobDir, `frame-${pad(frameIdx)}-hook.png`);
      await execAsync(FFMPEG, [
        "-y",
        "-f", "lavfi", "-i", `color=c=black:s=${FRAME_W}x${FRAME_H}:d=1`,
        "-i", baddieDlPath,
        "-i", hookOverlayPath,
        "-filter_complex",
        `[1:v]scale=${FRAME_W}:-1,crop=${FRAME_W}:min(ih\\,${FRAME_H}):0:(ih-min(ih\\,${FRAME_H}))/2[baddie];` +
        `[0:v][baddie]overlay=0:(${FRAME_H}-overlay_h)/2:shortest=1[composed];` +
        `[2:v]colorkey=0x00FF00:0.3:0.15[txt];` +
        `[composed][txt]overlay=0:0:shortest=1`,
        "-frames:v", "1",
        hookFramePath,
      ]);
      segments.push({
        kind: "image",
        path: hookFramePath,
        duration: hookDuration,
        ...(hookVoiceoverPath ? { commentaryAudio: hookVoiceoverPath } : {}),
      });
      frameIdx++;
    } else if (hookBgUrls.length > 0) {
      // Fallback: hook video background + text overlay (no baddie available)
      const hookBgUrl = hookBgUrls[Math.floor(Math.random() * hookBgUrls.length)];
      const hookBgPath = path.join(jobDir, `hook-bg-${frameIdx}.mp4`);
      await downloadFile(hookBgUrl, hookBgPath);

      const hookOverlayPath = path.join(jobDir, `hook-overlay-${frameIdx}.png`);
      await screenshotFrame(page, baseUrl, hookOverlayPath, {
        type: "hook-overlay",
        hook: conversation.hookText,
      });

      const hookOutPath = path.join(jobDir, `frame-${pad(frameIdx)}-hook.mp4`);
      await execAsync(FFMPEG, [
        "-y",
        "-stream_loop", "-1", "-i", hookBgPath,
        "-loop", "1", "-i", hookOverlayPath,
        "-t", String(hookDuration),
        "-filter_complex",
        `[0:v]scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=increase,crop=${FRAME_W}:${FRAME_H},` +
        `drawbox=x=0:y=0:w=${FRAME_W}:h=${FRAME_H}:color=black@0.4:t=fill[bg];` +
        `[1:v]colorkey=0x00FF00:0.3:0.15[txt];` +
        `[bg][txt]overlay=0:0`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS),
        "-an", "-preset", "fast", "-crf", "18",
        hookOutPath,
      ]);
      segments.push({
        kind: "video",
        path: hookOutPath,
        ...(hookVoiceoverPath ? { commentaryAudio: hookVoiceoverPath } : {}),
      });
      frameIdx++;
    } else {
      // Last fallback: static hook screenshot
      const hookPath = path.join(jobDir, `frame-${pad(frameIdx)}-hook.png`);
      await screenshotFrame(page, baseUrl, hookPath, {
        type: "hook",
        hook: conversation.hookText,
      });
      segments.push({
        kind: "image",
        path: hookPath,
        duration: hookDuration,
        ...(hookVoiceoverPath ? { commentaryAudio: hookVoiceoverPath } : {}),
      });
      frameIdx++;
    }

    // Generate commentary voiceover audio for messages that have it.
    // Done up-front so ElevenLabs calls run before the segment loop.
    const commentaryAudioPaths: Map<number, string> = new Map();
    for (let i = 0; i < conversation.messages.length; i++) {
      const msg = conversation.messages[i];
      if (msg.commentary) {
        try {
          const audioPath = path.join(jobDir, `commentary-${i}.mp3`);
          await generateCommentaryAudio(msg.commentary, audioPath);
          commentaryAudioPaths.set(i, audioPath);
          console.log(`[Video Build] Commentary ${i}: "${msg.commentary.slice(0, 50)}..."`);
        } catch (err) {
          console.warn(`[Video Build] Failed to generate commentary ${i}:`, err);
        }
      }
    }

    // Walk through messages
    const visibleMessages: { sender: string; text: string }[] = [];

    for (let msgIdx = 0; msgIdx < conversation.messages.length; msgIdx++) {
      const msg = conversation.messages[msgIdx];
      if (msg.sender === "man" && msg.show_godtext_ui) {
        // Show the "Send this" reply screen directly — no cooking animation
        const replyPath = path.join(
          jobDir,
          `frame-${pad(frameIdx)}-reply.png`,
        );
        await screenshotFrame(page, baseUrl, replyPath, {
          type: "reply",
          reply: msg.text,
          theme,
        });
        segments.push({
          kind: "image",
          path: replyPath,
          duration: TIMING.reply,
        });
        frameIdx++;
      }

      // Phone screen — show only the last 2 messages (the latest exchange)
      // for readability. Big centered bubbles, no clutter.
      visibleMessages.push({ sender: msg.sender, text: msg.text });
      const recentMessages = visibleMessages.slice(-2);
      const phonePath = path.join(
        jobDir,
        `frame-${pad(frameIdx)}-phone.png`,
      );
      await screenshotFrame(page, baseUrl, phonePath, {
        type: "phone",
        platform: conversation.platform,
        messages: JSON.stringify(recentMessages),
        ...(conversation.womanName
          ? { womanName: conversation.womanName }
          : {}),
      });
      // If this message has commentary, attach the audio to this segment.
      // The commentary plays during this frame — we extend the duration to
      // fit the voiceover so the narrator has time to speak.
      const commentaryPath = commentaryAudioPaths.get(msgIdx);
      let frameDuration = TIMING.message;
      if (commentaryPath) {
        try {
          const probeRes = await execAsync(FFPROBE, [
            "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", commentaryPath,
          ]);
          const audioDur = parseFloat(probeRes.stdout.trim()) || 0;
          // Ensure frame is at least as long as the commentary + a small buffer
          frameDuration = Math.max(TIMING.message, audioDur + 0.5);
        } catch {
          // Fall back to default duration
        }
      }

      segments.push({
        kind: "image",
        path: phonePath,
        duration: frameDuration,
        ...(commentaryPath ? { commentaryAudio: commentaryPath } : {}),
      });
      frameIdx++;

      // Always splice a hype clip or meme after every woman message.
      // maximum escalation → big hype clips (anime, sports, celebrations)
      // everything else    → memes (funny reactions, images)
      if (msg.sender === "woman" && hypeClips.length > 0) {
        const esc = msg.escalation_level || "low";
        try {
          const clip = pickHypeClip(hypeClips, esc, usedClipUrls);
          if (clip) {
            // Detect whether this clip is a static image or animated/video
            const isStaticImage = /\.(png|jpe?g|webp)(\?|$)/i.test(clip.url);
            const ext = isStaticImage ? "png" : "mp4";
            const clipPath = path.join(jobDir, `clip-${frameIdx}.${ext}`);
            await downloadFile(clip.url, clipPath);
            if (isStaticImage) {
              segments.push({ kind: "image", path: clipPath, duration: 1.5 });
            } else {
              segments.push({ kind: "video", path: clipPath });
            }
            frameIdx++;
          }
        } catch {
          // Non-fatal — skip hype clip
        }
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }

  // FFmpeg assembly
  const outputPath = path.join(
    jobDir,
    `godtext-${conversation.platform.toLowerCase()}-${Date.now()}.mp4`,
  );
  await ffmpegAssemble(segments, musicPath, introAudioPath, outputPath, jobDir);

  return outputPath;
}

// ---------------------------------------------------------------------------
// CORS — allows the production site (anythinggoessolutionsllc.com) to call localhost
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Chrome Private Network Access: allow HTTPS sites to call localhost
  "Access-Control-Allow-Private-Network": "true",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ---------------------------------------------------------------------------
// POST /api/godtext/videos/build
// ---------------------------------------------------------------------------

/**
 * Builds a GodText AI video inline — no separate worker needed.
 * Launches Playwright to screenshot frames, encodes with ffmpeg,
 * uploads the MP4 to Vercel Blob. Only works locally (npm run dev).
 *
 * The production site at anythinggoessolutionsllc.com calls this endpoint on
 * localhost:3000 — CORS headers allow the cross-origin request.
 *
 * Body: { conversation: object, theme?: "dark" | "white" }
 * Returns: { videoUrl: string }
 */
export async function POST(req: NextRequest) {
  const jobDir = path.join("/tmp", `godtext-build-${Date.now()}`);

  try {
    const body = await req.json();
    const { conversation, theme } = body as {
      conversation?: Conversation;
      theme?: string;
    };

    if (!conversation || !conversation.messages || !conversation.platform) {
      return NextResponse.json(
        { error: "Valid conversation object required" },
        { status: 400 },
      );
    }

    await fs.mkdir(jobDir, { recursive: true });

    // Check how many unused baddies remain BEFORE building (build will use one)
    const unusedBefore = await fetchUnusedBaddiePhotos();
    const baddiesRemaining = Math.max(0, unusedBefore.length - 1); // minus the one this build will use

    // Build the video
    const videoPath = await buildVideo(
      conversation,
      theme || "dark",
      jobDir,
    );

    // Upload to Vercel Blob
    const filename = `godtext-videos/${path.basename(videoPath)}`;
    const blobUrl = await uploadToBlob(videoPath, filename);

    const warnings: string[] = [];
    if (baddiesRemaining === 0) {
      warnings.push("No baddie photos left! Ask Claude to generate more.");
    } else if (baddiesRemaining <= 5) {
      warnings.push(`Only ${baddiesRemaining} baddie photos remaining — time to generate more soon.`);
    }

    return NextResponse.json(
      { videoUrl: blobUrl, baddiesRemaining, warnings },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Video Build] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS });
  } finally {
    // Clean up temp files
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {
      // non-fatal
    }
  }
}
