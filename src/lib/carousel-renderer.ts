/**
 * Carousel slide renderer — generates 1080x1350 PNG images for Instagram/TikTok carousels.
 *
 * Brand style (from SKILL_2):
 *   - Dark background: #0a0a0a
 *   - White primary text
 *   - Green accent: #22c55e
 *   - Yellow accent: #facc15
 *   - Bold heavy fonts, large text
 *   - Page numbers top left
 *
 * Uses @napi-rs/canvas (pure Rust, works on Vercel serverless).
 */

import { createCanvas, GlobalFonts, loadImage, Image } from "@napi-rs/canvas";
import path from "path";
import type { AspirationSlides } from "./types";
import { generateCarouselImages } from "./openai-images";

// Register bundled Inter fonts. Vercel's Linux serverless runtime has no
// system fonts, so `Helvetica` (macOS-only) silently renders nothing.
const FONTS_DIR = path.join(process.cwd(), "src/lib/fonts");
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Bold.ttf"), "Inter");
  GlobalFonts.registerFromPath(path.join(FONTS_DIR, "Inter-Black.ttf"), "InterBlack");
  fontsRegistered = true;
}

const FONT_BOLD = "Inter";
const FONT_BLACK = "InterBlack";

const WIDTH = 1080;
const HEIGHT = 1350;

// Brand colors
const BG = "#0a0a0a";
const FG = "#FFFFFF";
const GREEN = "#22c55e";
const YELLOW = "#facc15";
const MUTED = "#71717a";

interface CarouselSpec {
  headline: string;          // Slide 1 hook
  slides: string[];          // Slides 2-5 content (max 4 items)
  closingText?: string;      // Final slide message — default "Follow @jakobpreneur"
  toolName?: string;         // Shown as small label
  carouselType?: "famous_person" | "tool_breakdown" | "aspiration";
  aspiration?: AspirationSlides; // only used when carouselType === "aspiration"
}

/**
 * Wrap text to fit within maxWidth at the given font.
 */
function wrapText(
  ctx: import("@napi-rs/canvas").SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Slide 1 — Bold hook headline.
 */
function renderHookSlide(spec: CarouselSpec): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Top-left page number
  ctx.fillStyle = MUTED;
  ctx.font = "bold 32px Inter";
  ctx.fillText("01 / 06", 60, 90);

  // Green dot accent
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(60 + 180, 79, 10, 0, Math.PI * 2);
  ctx.fill();

  // Tool name label (small, top)
  if (spec.toolName) {
    ctx.fillStyle = YELLOW;
    ctx.font = "bold 28px Inter";
    ctx.fillText(spec.toolName.toUpperCase(), 60, 160);
  }

  // Big centered headline
  ctx.fillStyle = FG;
  ctx.font = `bold 92px ${FONT_BLACK}`;
  const headlineLines = wrapText(ctx, spec.headline, WIDTH - 120);
  const startY = HEIGHT / 2 - (headlineLines.length * 100) / 2;
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, 60, startY + i * 110);
  });

  // Green "Swipe →" at bottom
  ctx.fillStyle = GREEN;
  ctx.font = "bold 40px Inter";
  ctx.fillText("Swipe →", 60, HEIGHT - 100);

  return canvas.toBuffer("image/png");
}

/**
 * Middle slides (2-5) — step-by-step content.
 */
function renderContentSlide(
  pageNum: number,
  totalPages: number,
  stepLabel: string,
  content: string
): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Top-left page number
  ctx.fillStyle = MUTED;
  ctx.font = "bold 32px Inter";
  ctx.fillText(
    `${String(pageNum).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`,
    60,
    90
  );

  // Step label in yellow pill
  const labelText = stepLabel.toUpperCase();
  ctx.font = "bold 36px Inter";
  const labelWidth = ctx.measureText(labelText).width + 60;
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  const labelX = 60;
  const labelY = 200;
  const labelH = 70;
  const radius = 35;
  ctx.moveTo(labelX + radius, labelY);
  ctx.arcTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + labelH, radius);
  ctx.arcTo(labelX + labelWidth, labelY + labelH, labelX, labelY + labelH, radius);
  ctx.arcTo(labelX, labelY + labelH, labelX, labelY, radius);
  ctx.arcTo(labelX, labelY, labelX + labelWidth, labelY, radius);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = BG;
  ctx.font = "bold 36px Inter";
  ctx.fillText(labelText, labelX + 30, labelY + labelH / 2 + 13);

  // Content text (large, centered-ish)
  ctx.fillStyle = FG;
  ctx.font = `bold 68px ${FONT_BLACK}`;
  const lines = wrapText(ctx, content, WIDTH - 120);
  const contentStartY = 380;
  lines.forEach((line, i) => {
    ctx.fillText(line, 60, contentStartY + i * 82);
  });

  // Bottom green accent bar
  ctx.fillStyle = GREEN;
  ctx.fillRect(60, HEIGHT - 80, 120, 10);

  return canvas.toBuffer("image/png");
}

/**
 * Final slide — follow CTA.
 */
function renderFinalSlide(
  totalPages: number,
  closingText: string = "IF THEY CAN DO IT,\nYOU CAN TOO."
): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Top-left page number
  ctx.fillStyle = MUTED;
  ctx.font = "bold 32px Inter";
  ctx.fillText(
    `${String(totalPages).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`,
    60,
    90
  );

  // Big closing message centered — auto-size by both line count AND the
  // widest line's measured width so long lines like "TAKE ACTION EVERY DAY"
  // never overflow the canvas. Start from the line-count cap and shrink
  // until the widest line fits inside the horizontal margins.
  const lines = closingText.split("\n");
  const MARGIN_X = 60;
  const maxWidth = WIDTH - MARGIN_X * 2;
  const lineCountCap = lines.length <= 3 ? 90 : lines.length <= 5 ? 74 : 64;
  let fontSize = lineCountCap;
  const MIN_FONT = 40;
  while (fontSize > MIN_FONT) {
    ctx.font = `bold ${fontSize}px ${FONT_BLACK}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth) break;
    fontSize -= 2;
  }
  const lineHeight = Math.round(fontSize * 1.15);
  ctx.fillStyle = FG;
  ctx.font = `bold ${fontSize}px ${FONT_BLACK}`;
  const totalH = lines.length * lineHeight;
  const blockStartY = 180;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width;
    ctx.fillText(line, (WIDTH - w) / 2, blockStartY + i * lineHeight);
  });

  // Follow CTA in green pill — placed below the text block
  const cta = "FOLLOW @JAKOBPRENEUR";
  ctx.font = "bold 54px Inter";
  const ctaW = ctx.measureText(cta).width + 80;
  const ctaH = 110;
  const ctaX = (WIDTH - ctaW) / 2;
  const ctaY = Math.max(blockStartY + totalH + 80, HEIGHT - 340);
  ctx.fillStyle = GREEN;
  const r = 55;
  ctx.beginPath();
  ctx.moveTo(ctaX + r, ctaY);
  ctx.arcTo(ctaX + ctaW, ctaY, ctaX + ctaW, ctaY + ctaH, r);
  ctx.arcTo(ctaX + ctaW, ctaY + ctaH, ctaX, ctaY + ctaH, r);
  ctx.arcTo(ctaX, ctaY + ctaH, ctaX, ctaY, r);
  ctx.arcTo(ctaX, ctaY, ctaX + ctaW, ctaY, r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = BG;
  ctx.font = "bold 54px Inter";
  ctx.fillText(cta, ctaX + 40, ctaY + ctaH / 2 + 20);

  // Small NOW YOU KNOW tag at bottom
  ctx.fillStyle = YELLOW;
  ctx.font = "bold 36px Inter";
  const nyk = "NOW YOU KNOW.";
  const nykW = ctx.measureText(nyk).width;
  ctx.fillText(nyk, (WIDTH - nykW) / 2, HEIGHT - 100);

  return canvas.toBuffer("image/png");
}

const MOTIVATIONAL_CLOSERS = [
  "MILLIONS OF PEOPLE\nTAKE ACTION EVERY DAY.\nWHY NOT YOU?",
  "YOU HAVE\nTHE TOOLS.\nYOU HAVE\nTHE TIME.\nWHAT ELSE\nDO YOU NEED?",
  "EVERY EXPERT\nWAS ONCE\nA BEGINNER\nWHO REFUSED\nTO QUIT.",
  "THE GAP BETWEEN\nDREAMING AND DOING\nIS ONE DECISION.\nMAKE IT TODAY.",
  "SOMEONE LESS\nQUALIFIED THAN YOU\nIS DOING IT RIGHT NOW.\nGO GET YOURS.",
  "STOP CONSUMING.\nSTART CREATING.\nTHE WORLD\nIS WAITING.",
  "YOU DON'T NEED\nANOTHER COURSE.\nYOU NEED\nONE HOUR\nOF DOING.",
  "THE BEST TIME\nTO START\nWAS YESTERDAY.\nTHE SECOND BEST\nIS NOW.",
  "OPPORTUNITY\nSHOWS UP\nDISGUISED AS WORK.\nSHOW UP ANYWAY.",
  "EVERY SCROLL\nIS A CHOICE\nTO STAY WHERE\nYOU ARE.\nCHOOSE DIFFERENTLY.",
];

/**
 * Celeb hook slide (aspiration carousel, slides 1-3).
 * Full-bleed image with a dark gradient at the bottom and the celeb-fact
 * text overlaid in bold. If the image failed to generate, falls back to a
 * text-on-dark card so the carousel still ships.
 */
function renderCelebSlide(
  pageNum: number,
  totalPages: number,
  fact: string,
  image: Image | null,
): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background — either full-bleed image or dark fallback
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (image) {
    // Cover-fit: scale to fill both dimensions, center-crop
    const srcAspect = image.width / image.height;
    const dstAspect = WIDTH / HEIGHT;
    let sx = 0, sy = 0, sw = image.width, sh = image.height;
    if (srcAspect > dstAspect) {
      // Source wider than frame — crop sides
      sw = image.height * dstAspect;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / dstAspect;
      sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, WIDTH, HEIGHT);
  }

  // Dark gradient from bottom up — keeps overlay text readable even on
  // bright or busy celeb photos. Covers bottom 55% of the frame.
  const grad = ctx.createLinearGradient(0, HEIGHT * 0.45, 0, HEIGHT);
  grad.addColorStop(0, "rgba(10,10,10,0)");
  grad.addColorStop(1, "rgba(10,10,10,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, HEIGHT * 0.45, WIDTH, HEIGHT * 0.55);

  // Top-left page number — rendered on a subtle pill so it stays readable
  // if the photo is light in that corner.
  const pageText = `${String(pageNum).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;
  ctx.font = "bold 32px Inter";
  const pageW = ctx.measureText(pageText).width + 40;
  ctx.fillStyle = "rgba(10,10,10,0.55)";
  ctx.beginPath();
  ctx.moveTo(50 + 20, 60);
  ctx.arcTo(50 + pageW, 60, 50 + pageW, 60 + 52, 20);
  ctx.arcTo(50 + pageW, 60 + 52, 50, 60 + 52, 20);
  ctx.arcTo(50, 60 + 52, 50, 60, 20);
  ctx.arcTo(50, 60, 50 + pageW, 60, 20);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = FG;
  ctx.fillText(pageText, 70, 96);

  // Fact overlay — white bold text on the dark gradient, lower portion.
  ctx.fillStyle = FG;
  const MARGIN_X = 60;
  const maxWidth = WIDTH - MARGIN_X * 2;
  let fontSize = 72;
  const MIN_FONT = 42;
  let lines: string[] = [];
  while (fontSize >= MIN_FONT) {
    ctx.font = `bold ${fontSize}px ${FONT_BLACK}`;
    lines = wrapText(ctx, fact, maxWidth);
    if (lines.length <= 4) break;
    fontSize -= 4;
  }
  const lineHeight = Math.round(fontSize * 1.15);
  const blockH = lines.length * lineHeight;
  const startY = HEIGHT - 120 - blockH;
  lines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X, startY + i * lineHeight + fontSize);
  });

  return canvas.toBuffer("image/png");
}

/**
 * Thesis / transition / tool-intro / benefit / scale slide for the
 * aspiration carousel. Text-on-dark, distinct pill label per slot.
 */
function renderAspirationTextSlide(
  pageNum: number,
  totalPages: number,
  label: string,
  content: string,
  accentColor: string,
): Buffer {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = MUTED;
  ctx.font = "bold 32px Inter";
  ctx.fillText(
    `${String(pageNum).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`,
    60,
    90,
  );

  // Colored pill label at top
  const labelText = label.toUpperCase();
  ctx.font = "bold 36px Inter";
  const labelWidth = ctx.measureText(labelText).width + 60;
  ctx.fillStyle = accentColor;
  const labelX = 60, labelY = 200, labelH = 70, radius = 35;
  ctx.beginPath();
  ctx.moveTo(labelX + radius, labelY);
  ctx.arcTo(labelX + labelWidth, labelY, labelX + labelWidth, labelY + labelH, radius);
  ctx.arcTo(labelX + labelWidth, labelY + labelH, labelX, labelY + labelH, radius);
  ctx.arcTo(labelX, labelY + labelH, labelX, labelY, radius);
  ctx.arcTo(labelX, labelY, labelX + labelWidth, labelY, radius);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = BG;
  ctx.font = "bold 36px Inter";
  ctx.fillText(labelText, labelX + 30, labelY + labelH / 2 + 13);

  // Body text — auto-size to fit
  const MARGIN_X = 60;
  const maxWidth = WIDTH - MARGIN_X * 2;
  let fontSize = 72;
  const MIN_FONT = 44;
  let lines: string[] = [];
  while (fontSize >= MIN_FONT) {
    ctx.font = `bold ${fontSize}px ${FONT_BLACK}`;
    lines = wrapText(ctx, content, maxWidth);
    if (lines.length <= 6) break;
    fontSize -= 4;
  }
  const lineHeight = Math.round(fontSize * 1.2);
  const startY = 380;
  ctx.fillStyle = FG;
  ctx.font = `bold ${fontSize}px ${FONT_BLACK}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, MARGIN_X, startY + i * lineHeight);
  });

  // Bottom accent bar in the same color as the pill
  ctx.fillStyle = accentColor;
  ctx.fillRect(60, HEIGHT - 80, 120, 10);

  return canvas.toBuffer("image/png");
}

/**
 * Render a full carousel. Async because aspiration carousels fetch
 * AI-generated images over the network before compositing.
 *
 * Slides: 1 hook + N content slides + 1 final CTA.  (or for aspiration:
 * 3 celeb + 1 thesis + 1 transition + 1 tool intro + 1 benefit + 1 scale + 1 CTA).
 */
export async function renderCarousel(spec: CarouselSpec): Promise<Buffer[]> {
  ensureFonts();

  // Aspiration path — 9 slides, celeb images on 1-3, text on 4-9.
  // If anything in the image path fails, we fall back to the tool_breakdown
  // layout so the carousel still ships.
  if (spec.carouselType === "aspiration" && spec.aspiration) {
    try {
      return await renderAspirationCarousel(spec, spec.aspiration);
    } catch (err) {
      console.error("[carousel-renderer] aspiration path failed, falling back:", err);
      // fall through to tool_breakdown below
    }
  }

  // Default path — unchanged from previous sync behavior.
  return renderToolBreakdown(spec);
}

function renderToolBreakdown(spec: CarouselSpec): Buffer[] {
  const contentSlideCount = Math.min(4, spec.slides.length);
  const totalPages = 1 + contentSlideCount + 1;
  const step_labels = ["WHAT IT DOES", "HOW TO USE IT", "WHY IT MATTERS", "WHO IT'S FOR"];

  const images: Buffer[] = [];
  images.push(renderHookSlide(spec));

  for (let i = 0; i < contentSlideCount; i++) {
    const content = spec.slides[i] || "";
    const cleaned = content.replace(/^[^:]+:\s*/, "").trim();
    images.push(renderContentSlide(i + 2, totalPages, step_labels[i] || `STEP ${i + 1}`, cleaned));
  }

  const closing =
    spec.closingText ||
    MOTIVATIONAL_CLOSERS[Math.floor(Math.random() * MOTIVATIONAL_CLOSERS.length)];
  images.push(renderFinalSlide(totalPages, closing));

  return images;
}

async function renderAspirationCarousel(
  spec: CarouselSpec,
  aspiration: AspirationSlides,
): Promise<Buffer[]> {
  const totalPages = 9;
  const images: Buffer[] = [];

  // Slides 1-3 — parallel image generation, then composite. If a slide's
  // image gen failed (Airtable JSON had no imageUrl), generate on the fly.
  const celebImages: (Image | null)[] = await Promise.all(
    aspiration.celebs.map(async (c) => {
      try {
        if (c.imageUrl) {
          return await loadImage(c.imageUrl);
        }
      } catch (err) {
        console.error("[carousel-renderer] failed to load stored celeb image:", err);
      }
      return null;
    }),
  );

  // If any image is missing, try to fill it in now from the prompt.
  const missing = celebImages.map((img, i) => (img ? null : i)).filter((i) => i !== null) as number[];
  if (missing.length > 0) {
    const prompts = missing.map((i) => aspiration.celebs[i].imagePrompt);
    const generated = await generateCarouselImages(prompts, { quality: "high" });
    for (let j = 0; j < missing.length; j++) {
      const gen = generated[j];
      if (gen) {
        try {
          celebImages[missing[j]] = await loadImage(gen.url);
        } catch (err) {
          console.error("[carousel-renderer] failed to load freshly-generated image:", err);
        }
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    const c = aspiration.celebs[i];
    images.push(renderCelebSlide(i + 1, totalPages, c?.fact || "", celebImages[i]));
  }

  // Slides 4-8 — text on dark, each with a distinct pill color
  images.push(renderAspirationTextSlide(4, totalPages, "THE LESSON", aspiration.thesis, YELLOW));
  images.push(renderAspirationTextSlide(5, totalPages, "BUT HERE'S THE THING", aspiration.transition, GREEN));
  images.push(renderAspirationTextSlide(6, totalPages, "THE TOOL", aspiration.toolIntro, YELLOW));
  images.push(renderAspirationTextSlide(7, totalPages, "WHY IT MATTERS", aspiration.benefit, GREEN));
  images.push(renderAspirationTextSlide(8, totalPages, "WHERE IT WORKS", aspiration.scale, YELLOW));

  // Slide 9 — existing CTA closer
  const closing =
    spec.closingText ||
    MOTIVATIONAL_CLOSERS[Math.floor(Math.random() * MOTIVATIONAL_CLOSERS.length)];
  images.push(renderFinalSlide(totalPages, closing));

  return images;
}
