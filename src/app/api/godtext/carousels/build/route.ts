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

const FRAME_W = 1080;
const FRAME_H = 1920;

// Airtable config
const AIRTABLE_API = "https://api.airtable.com/v0";

function airtableHeaders(): Record<string, string> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY not set");
  return { Authorization: `Bearer ${key}` };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type HypeClip = { url: string; clipType: string };

type BaddiePhoto = { id: string; url: string };

// ---------------------------------------------------------------------------
// Vault fetchers (same as video build)
// ---------------------------------------------------------------------------

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
      clipType: (r.fields["Clip Type"] as string) || "Meme",
    }));
}

async function fetchBaddiePhotos(): Promise<BaddiePhoto[]> {
  const base = process.env.AIRTABLE_BASE_ID;
  if (!base) return [];
  const url = new URL(
    `${AIRTABLE_API}/${base}/${encodeURIComponent("GodText Baddie Photos")}`,
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
  contentType = "image/png",
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const fileBuffer = await fs.readFile(filePath);
  const res = await fetch(`https://blob.vercel-storage.com/${filename}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
      "x-content-type": contentType,
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
      "Playwright not available. Carousel building only works locally with npm run dev.",
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
// Pick a meme (static images only — no GIFs/videos for carousels)
// ---------------------------------------------------------------------------

function pickMeme(
  clips: HypeClip[],
  usedUrls: Set<string>,
): HypeClip | null {
  // Only pick static image memes for carousels
  const memes = clips.filter(
    (c) =>
      c.clipType === "Meme" &&
      /\.(png|jpe?g|webp)(\?|$)/i.test(c.url),
  );
  const available = memes.filter((c) => !usedUrls.has(c.url));
  const pool = available.length > 0 ? available : memes;
  if (pool.length === 0) return null;

  const pick = pool[Math.floor(Math.random() * pool.length)];
  usedUrls.add(pick.url);
  return pick;
}

// ---------------------------------------------------------------------------
// Main carousel build logic
// ---------------------------------------------------------------------------

async function buildCarousel(
  conversation: Conversation,
  theme: string,
  jobDir: string,
): Promise<string[]> {
  const baseUrl = "http://localhost:3000";

  const [hypeClips, unusedBaddies] = await Promise.all([
    fetchHypeClips(),
    fetchBaddiePhotos(),
  ]);

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

  const slides: string[] = [];
  let slideIdx = 0;
  const usedMemeUrls = new Set<string>();

  try {
    // ---------------------------------------------------------------
    // Slide 1: Hook — baddie photo with "Texting huzz / *Take notes*"
    // ---------------------------------------------------------------
    if (unusedBaddies.length > 0) {
      const baddie =
        unusedBaddies[Math.floor(Math.random() * unusedBaddies.length)];
      const baddieDlPath = path.join(jobDir, `baddie-${slideIdx}.jpg`);
      await downloadFile(baddie.url, baddieDlPath);

      const hookOverlayPath = path.join(
        jobDir,
        `hook-overlay-${slideIdx}.png`,
      );
      await screenshotFrame(page, baseUrl, hookOverlayPath, {
        type: "hook-overlay",
        hook: "Texting huzz\n*Take notes*",
      });

      // Compose: baddie + dark overlay + text
      const hookSlidePath = path.join(
        jobDir,
        `slide-${String(slideIdx).padStart(3, "0")}.png`,
      );
      await execAsync(FFMPEG, [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=black:s=${FRAME_W}x${FRAME_H}:d=1`,
        "-i",
        baddieDlPath,
        "-i",
        hookOverlayPath,
        "-filter_complex",
        `[1:v]scale=${FRAME_W}:-1,crop=${FRAME_W}:min(ih\\,${FRAME_H}):0:(ih-min(ih\\,${FRAME_H}))/2[baddie];` +
          `[0:v][baddie]overlay=0:(${FRAME_H}-overlay_h)/2:shortest=1,` +
          `drawbox=x=0:y=0:w=${FRAME_W}:h=${FRAME_H}:color=black@0.45:t=fill[composed];` +
          `[2:v]colorkey=0x00FF00:0.3:0.15[txt];` +
          `[composed][txt]overlay=0:0:shortest=1`,
        "-frames:v",
        "1",
        hookSlidePath,
      ]);
      slides.push(hookSlidePath);
      slideIdx++;
    } else {
      // Fallback: static hook screenshot
      const hookPath = path.join(
        jobDir,
        `slide-${String(slideIdx).padStart(3, "0")}.png`,
      );
      await screenshotFrame(page, baseUrl, hookPath, {
        type: "hook",
        hook: conversation.hookText,
      });
      slides.push(hookPath);
      slideIdx++;
    }

    // ---------------------------------------------------------------
    // Walk through messages — 2 messages per slide + meme after woman
    // ---------------------------------------------------------------
    const visibleMessages: { sender: string; text: string }[] = [];

    for (const msg of conversation.messages) {
      // Add message to visible stack
      visibleMessages.push({ sender: msg.sender, text: msg.text });
      const recentMessages = visibleMessages.slice(-2);

      // Phone conversation slide
      const phonePath = path.join(
        jobDir,
        `slide-${String(slideIdx).padStart(3, "0")}.png`,
      );
      await screenshotFrame(page, baseUrl, phonePath, {
        type: "phone",
        platform: conversation.platform,
        messages: JSON.stringify(recentMessages),
        ...(conversation.womanName
          ? { womanName: conversation.womanName }
          : {}),
      });
      slides.push(phonePath);
      slideIdx++;

      // Insert a meme after every woman message
      if (msg.sender === "woman" && hypeClips.length > 0) {
        try {
          const meme = pickMeme(hypeClips, usedMemeUrls);
          if (meme) {
            const memeDlPath = path.join(jobDir, `meme-${slideIdx}.png`);
            await downloadFile(meme.url, memeDlPath);

            // Scale meme to 1080x1920 with black padding
            const memeSlide = path.join(
              jobDir,
              `slide-${String(slideIdx).padStart(3, "0")}.png`,
            );
            await execAsync(FFMPEG, [
              "-y",
              "-i",
              memeDlPath,
              "-vf",
              `scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:black`,
              "-frames:v",
              "1",
              memeSlide,
            ]);
            slides.push(memeSlide);
            slideIdx++;
          }
        } catch {
          // Non-fatal — skip meme
        }
      }
    }

    // ---------------------------------------------------------------
    // Last slide: Cooking screen (frozen at step 2 — "Crafting replies")
    // ---------------------------------------------------------------
    const cookPath = path.join(
      jobDir,
      `slide-${String(slideIdx).padStart(3, "0")}.png`,
    );
    await screenshotFrame(page, baseUrl, cookPath, {
      type: "cooking",
      theme,
      phase: "cooking",
      step: "2",
    });
    slides.push(cookPath);
  } finally {
    await page.close();
    await browser.close();
  }

  return slides;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

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
// POST /api/godtext/carousels/build
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const jobDir = path.join("/tmp", `godtext-carousel-${Date.now()}`);

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

    // Build the carousel slides
    const slidePaths = await buildCarousel(
      conversation,
      theme || "dark",
      jobDir,
    );

    // Upload each slide to Vercel Blob
    const slideUrls: string[] = [];
    for (let i = 0; i < slidePaths.length; i++) {
      const filename = `godtext-carousels/${Date.now()}-slide-${String(i).padStart(2, "0")}.png`;
      const url = await uploadToBlob(slidePaths[i], filename);
      slideUrls.push(url);
    }

    return NextResponse.json(
      { slideUrls, slideCount: slideUrls.length },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Carousel Build] Error:", msg);
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
