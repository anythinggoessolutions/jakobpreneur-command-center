import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { generateThirstTrapCarousel } from "@/lib/godtext-thirst-trap-generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const maxDuration = 300;

const execAsync = promisify(execFile);

const FFMPEG = "/opt/homebrew/bin/ffmpeg";

const FRAME_W = 1080;
const FRAME_H = 1920;

const AIRTABLE_API = "https://api.airtable.com/v0";

function airtableHeaders(): Record<string, string> {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY not set");
  return { Authorization: `Bearer ${key}` };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BaddiePhoto = { id: string; url: string };

// ---------------------------------------------------------------------------
// Vault fetchers
// ---------------------------------------------------------------------------

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
    .filter(
      (r: { id: string; fields: Record<string, unknown> }) =>
        r.fields["Image URL"],
    )
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
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN not set");

  const fileBuffer = await fs.readFile(filePath);
  const res = await fetch(`https://blob.vercel-storage.com/${filename}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/png",
      "x-content-type": "image/png",
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
      "Playwright not available. Only works locally with npm run dev.",
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
// Main build logic
// ---------------------------------------------------------------------------

async function buildThirstTrapCarousel(
  jobDir: string,
): Promise<{ slideUrls: string[]; topic: string; slideCount: number }> {
  const baseUrl = "http://localhost:3000";

  // 1. Generate content with Claude
  console.log("[Thirst Trap] Generating slide content with Claude...");
  const content = await generateThirstTrapCarousel();
  console.log(
    `[Thirst Trap] Generated ${content.slides.length} slides, topic: "${content.topic}"`,
  );

  // 2. Fetch baddie photos
  const baddies = await fetchBaddiePhotos();

  if (baddies.length === 0) {
    throw new Error(
      "No baddie photos available. Upload some to the Baddie Photos vault first.",
    );
  }

  // Shuffle baddies so each slide gets a different photo
  const shuffled = [...baddies].sort(() => Math.random() - 0.5);

  // Warm up render page
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

  const slideUrls: string[] = [];

  try {
    for (let i = 0; i < content.slides.length; i++) {
      const slide = content.slides[i];
      const baddie = shuffled[i % shuffled.length];

      // Download baddie photo
      const baddiePath = path.join(jobDir, `baddie-${i}.jpg`);
      await downloadFile(baddie.url, baddiePath);

      // Render text overlay on green screen (with font pairing from Claude)
      const overlayPath = path.join(jobDir, `overlay-${i}.png`);
      await screenshotFrame(page, baseUrl, overlayPath, {
        type: "thirst-trap",
        headline: slide.headline,
        subtext: slide.subtext || "",
        slideType: slide.slideType,
        fontPairing: content.fontPairing || "syne",
      });

      // Compose: baddie photo + dark overlay + text
      const slidePath = path.join(
        jobDir,
        `slide-${String(i).padStart(2, "0")}.png`,
      );
      await execAsync(FFMPEG, [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=black:s=${FRAME_W}x${FRAME_H}:d=1`,
        "-i",
        baddiePath,
        "-i",
        overlayPath,
        "-filter_complex",
        `[1:v]scale=${FRAME_W}:-1,crop=${FRAME_W}:min(ih\\,${FRAME_H}):0:(ih-min(ih\\,${FRAME_H}))/2[baddie];` +
          `[0:v][baddie]overlay=0:(${FRAME_H}-overlay_h)/2:shortest=1,` +
          `drawbox=x=0:y=0:w=${FRAME_W}:h=${FRAME_H}:color=black@0.30:t=fill[composed];` +
          `[2:v]colorkey=0x00FF00:0.3:0.15[txt];` +
          `[composed][txt]overlay=0:0:shortest=1`,
        "-frames:v",
        "1",
        slidePath,
      ]);

      // Upload to Vercel Blob
      const filename = `godtext-thirst-trap/${Date.now()}-slide-${String(i).padStart(2, "0")}.png`;
      const url = await uploadToBlob(slidePath, filename);
      slideUrls.push(url);

      console.log(
        `[Thirst Trap] Built slide ${i + 1}/${content.slides.length}: "${slide.headline}"`,
      );
    }
  } finally {
    await page.close();
    await browser.close();
  }

  return {
    slideUrls,
    topic: content.topic,
    slideCount: slideUrls.length,
  };
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
// POST /api/godtext/carousels/thirst-trap
// ---------------------------------------------------------------------------

export async function POST(_req: NextRequest) {
  const jobDir = path.join("/tmp", `godtext-thirst-trap-${Date.now()}`);

  try {
    await fs.mkdir(jobDir, { recursive: true });

    const result = await buildThirstTrapCarousel(jobDir);

    return NextResponse.json(
      {
        slideUrls: result.slideUrls,
        topic: result.topic,
        slideCount: result.slideCount,
      },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Thirst Trap] Error:", msg);
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
