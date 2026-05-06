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

const INSTAGRAM_HASHTAGS =
  "#aitools #chatgpt #claudeai #grok #aiagents #automation #aiautomation #productivitytools #digitalcreator #techcreator #entrepreneurmindset #futuretech";

const TIKTOK_HASHTAGS =
  "#aitools #chatgpt #claudeai #grok #ai #fyp #techtok #productivity";

const YOUTUBE_DESCRIPTION_HASHTAGS =
  "#aitools #chatgpt #claudeai #grok #shorts";

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
    INSTAGRAM_HASHTAGS,
  ].join("\n");

  const tiktok = [
    firstLine,
    "",
    "Watch to the end to find out what it is.",
    "",
    TIKTOK_HASHTAGS,
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
    YOUTUBE_DESCRIPTION_HASHTAGS,
  ].join("\n");

  return {
    instagram,
    tiktok,
    youtubeTitle,
    youtubeDescription,
  };
}
