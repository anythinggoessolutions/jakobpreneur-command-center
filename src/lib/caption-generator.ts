/**
 * Generates per-platform post captions from tool info.
 * Each platform has different conventions for length, hashtags, and style.
 */

import { QueuedTool } from "./types";

export interface SocialCaptions {
  instagram: string;
  tiktok: string;
  youtubeTitle: string;
  youtubeDescription: string;
}

const BASE_HASHTAGS = [
  "#aitools",
  "#aiforcreators",
  "#aiproductivity",
  "#automation",
  "#entrepreneur",
];

const PLATFORM_HASHTAGS = {
  instagram: [
    "#aitoolsyouneedtoknow",
    "#jakobpreneur",
    "#aihacks",
    "#techtips",
    "#productivity",
    "#sidehustle",
    "#creators",
    "#newtools",
    "#artificialintelligence",
  ],
  tiktok: [
    "#ai",
    "#aitools",
    "#aitok",
    "#techtok",
    "#fyp",
    "#foryou",
    "#jakobpreneur",
    "#productivity",
  ],
};

function categoryHashtags(category: string): string[] {
  const cat = category.toLowerCase();
  const tags: string[] = [];

  if (cat.includes("video")) tags.push("#aivideo", "#videoediting");
  if (cat.includes("code") || cat.includes("coding")) tags.push("#aicoding", "#nocode", "#vibecoding");
  if (cat.includes("image") || cat.includes("art")) tags.push("#aiart", "#midjourney");
  if (cat.includes("voice") || cat.includes("audio")) tags.push("#aivoice", "#voiceai");
  if (cat.includes("writ")) tags.push("#aiwriting", "#copywriting");
  if (cat.includes("search")) tags.push("#aisearch", "#googlealternative");
  if (cat.includes("presentation")) tags.push("#aipresentations", "#slidedecks");
  if (cat.includes("research")) tags.push("#airesearch", "#study");

  return tags;
}

export function generateCaptions(item: QueuedTool): SocialCaptions {
  const { tool, script } = item;
  const partText = script.hookType === "B" ? `Pt. ${tool.partNumber}` : "";

  // Pull the hook text (first line) for use as a teaser. Strip any legacy
  // "@jakobpreneur:" prefix — Hook B used to include it, and scripts
  // generated before 2026-04-23 still have it stored in Airtable. New
  // scripts won't hit this regex; it's only for cleaning stale rows.
  const firstLine = script.hook
    .split("\n")[0]
    .replace(/^@jakobpreneur:\s*/i, "")
    .trim();
  const benefit = script.benefit.replace(/^It'll\s+/i, "").replace(/\.$/, "");

  // Build tags
  const categoryTags = categoryHashtags(tool.category);

  // ----------------------------------------------------------------
  // Instagram caption (up to 2200 chars, heavy hashtags)
  // ----------------------------------------------------------------
  const igTags = [
    ...PLATFORM_HASHTAGS.instagram,
    ...categoryTags,
    ...BASE_HASHTAGS,
  ].slice(0, 25).join(" ");

  // Curiosity gap: don't name the tool or include its URL — viewers must
  // watch the video to find out what it is. Drives watch-time + comments
  // ("what's the name?!") at the cost of clickthroughs from caption.
  const instagram = [
    firstLine,
    "",
    "Watch to the end to find out what it is.",
    "",
    "🟢 Save this for later",
    "🟢 Share with a friend who'd use this",
    "🟢 Follow @jakobpreneur for more",
    "",
    "Now you know.",
    "",
    igTags,
  ].join("\n");

  // ----------------------------------------------------------------
  // TikTok caption (2200 chars but shorter is better)
  // ----------------------------------------------------------------
  const tiktokTags = [
    ...PLATFORM_HASHTAGS.tiktok,
    ...categoryTags.slice(0, 2),
  ].slice(0, 8).join(" ");

  const tiktok = [
    firstLine,
    "",
    "Watch to the end to find out what it is.",
    "",
    tiktokTags,
  ].join("\n");

  // ----------------------------------------------------------------
  // YouTube Shorts title (100 chars max) and description
  // ----------------------------------------------------------------
  // Titles do NOT name the tool — same curiosity-gap rule as the IG caption.
  let youtubeTitle: string;
  switch (script.hookType) {
    case "B":
      youtubeTitle = `Powerful AI Tools You Should Know ${partText} #shorts`;
      break;
    case "A":
      youtubeTitle = `I Was Today Years Old When I Found This Out #shorts`;
      break;
    case "D":
      youtubeTitle = `The Website They Don't Want You To Know About #shorts`;
      break;
    case "E":
      youtubeTitle = `Bookmark This Before It Goes Viral #shorts`;
      break;
    case "F":
      youtubeTitle = `Stop What You're Doing #shorts`;
      break;
    case "C":
    default:
      youtubeTitle = `This AI Will Change How You Work #shorts`;
      break;
  }
  youtubeTitle = youtubeTitle.slice(0, 100);

  // Description follows the same curiosity-gap rule — no tool name, no URL.
  // Description-side hashtags still carry category keywords for discovery.
  const youtubeDescription = [
    firstLine,
    "",
    "Watch the full video to find out what this is.",
    "",
    "🟢 Subscribe for more AI tools and automation tips",
    "",
    "---",
    "",
    "FOLLOW @jakobpreneur:",
    "Instagram: https://instagram.com/jakobpreneur",
    "TikTok: https://tiktok.com/@jakobpreneur",
    "X: https://x.com/jakobpreneur",
    "",
    "---",
    "",
    [
      "#shorts", "#aitools", "#aiforcreators",
      ...categoryTags.slice(0, 3),
      "#jakobpreneur",
    ].join(" "),
  ].join("\n");

  return {
    instagram,
    tiktok,
    youtubeTitle,
    youtubeDescription,
  };
}
