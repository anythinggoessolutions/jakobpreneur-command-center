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

import { createCanvas } from "@napi-rs/canvas";

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
  carouselType?: "famous_person" | "tool_breakdown";
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
  ctx.font = "bold 32px Helvetica";
  ctx.fillText("01 / 06", 60, 90);

  // Green dot accent
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(60 + 180, 79, 10, 0, Math.PI * 2);
  ctx.fill();

  // Tool name label (small, top)
  if (spec.toolName) {
    ctx.fillStyle = YELLOW;
    ctx.font = "bold 28px Helvetica";
    ctx.fillText(spec.toolName.toUpperCase(), 60, 160);
  }

  // Big centered headline
  ctx.fillStyle = FG;
  ctx.font = "bold 92px Helvetica";
  const headlineLines = wrapText(ctx, spec.headline, WIDTH - 120);
  const startY = HEIGHT / 2 - (headlineLines.length * 100) / 2;
  headlineLines.forEach((line, i) => {
    ctx.fillText(line, 60, startY + i * 110);
  });

  // Green "Swipe →" at bottom
  ctx.fillStyle = GREEN;
  ctx.font = "bold 40px Helvetica";
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
  ctx.font = "bold 32px Helvetica";
  ctx.fillText(
    `${String(pageNum).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`,
    60,
    90
  );

  // Step label in yellow pill
  const labelText = stepLabel.toUpperCase();
  ctx.font = "bold 36px Helvetica";
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
  ctx.font = "bold 36px Helvetica";
  ctx.fillText(labelText, labelX + 30, labelY + labelH / 2 + 13);

  // Content text (large, centered-ish)
  ctx.fillStyle = FG;
  ctx.font = "bold 68px Helvetica";
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
  ctx.font = "bold 32px Helvetica";
  ctx.fillText(
    `${String(totalPages).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`,
    60,
    90
  );

  // Big closing message centered — auto-sized based on line count
  const lines = closingText.split("\n");
  // Scale font based on lines so text always fits nicely
  const fontSize = lines.length <= 3 ? 90 : lines.length <= 5 ? 74 : 64;
  const lineHeight = Math.round(fontSize * 1.15);
  ctx.fillStyle = FG;
  ctx.font = `bold ${fontSize}px Helvetica`;
  const totalH = lines.length * lineHeight;
  const blockStartY = 180;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width;
    ctx.fillText(line, (WIDTH - w) / 2, blockStartY + i * lineHeight);
  });

  // Follow CTA in green pill — placed below the text block
  const cta = "FOLLOW @JAKOBPRENEUR";
  ctx.font = "bold 54px Helvetica";
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
  ctx.font = "bold 54px Helvetica";
  ctx.fillText(cta, ctaX + 40, ctaY + ctaH / 2 + 20);

  // Small NOW YOU KNOW tag at bottom
  ctx.fillStyle = YELLOW;
  ctx.font = "bold 36px Helvetica";
  const nyk = "NOW YOU KNOW.";
  const nykW = ctx.measureText(nyk).width;
  ctx.fillText(nyk, (WIDTH - nykW) / 2, HEIGHT - 100);

  return canvas.toBuffer("image/png");
}

/**
 * Render a full carousel. Returns array of PNG buffers.
 * Slides: 1 hook + N content slides + 1 final CTA.
 */
export function renderCarousel(spec: CarouselSpec): Buffer[] {
  const contentSlideCount = Math.min(4, spec.slides.length);
  const totalPages = 1 + contentSlideCount + 1;

  const step_labels = ["WHAT IT DOES", "HOW TO USE IT", "WHY IT MATTERS", "WHO IT'S FOR"];

  const images: Buffer[] = [];

  // Slide 1: hook
  images.push(renderHookSlide(spec));

  // Slides 2-N: content
  for (let i = 0; i < contentSlideCount; i++) {
    const content = spec.slides[i] || "";
    // Strip "Label:" prefix if present
    const cleaned = content.replace(/^[^:]+:\s*/, "").trim();
    images.push(renderContentSlide(i + 2, totalPages, step_labels[i] || `STEP ${i + 1}`, cleaned));
  }

  // Final slide — rotating motivational closers (jakobpreneur voice)
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
  const closing =
    spec.closingText ||
    MOTIVATIONAL_CLOSERS[Math.floor(Math.random() * MOTIVATIONAL_CLOSERS.length)];
  images.push(renderFinalSlide(totalPages, closing));

  return images;
}
