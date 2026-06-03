/**
 * Post Everywhere API client for GodText AI video distribution.
 *
 * Handles the 3-step video upload flow (presigned URL) and post
 * scheduling across TikTok, Instagram Reels, and YouTube Shorts.
 *
 * API docs: https://developers.posteverywhere.ai
 * Base URL: https://app.posteverywhere.ai/api/v1
 */

const PE_BASE = "https://app.posteverywhere.ai/api/v1";

function peHeaders(): Record<string, string> {
  const key = process.env.POST_EVERYWHERE_API_KEY;
  if (!key) throw new Error("POST_EVERYWHERE_API_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// ---------------------------------------------------------------------------
// Account IDs (hardcoded — these won't change)
// ---------------------------------------------------------------------------
export const PE_ACCOUNTS = {
  instagram: 6124,
  tiktok: 6313,
  tiktokSmoothreply: 6282,
  youtube: 6125,
} as const;

export const ALL_ACCOUNT_IDS = [
  PE_ACCOUNTS.instagram,
  PE_ACCOUNTS.tiktok,
  PE_ACCOUNTS.tiktokSmoothreply,
  PE_ACCOUNTS.youtube,
];

// ---------------------------------------------------------------------------
// Schedule slots (US Eastern)
// ---------------------------------------------------------------------------
export const DAILY_SLOTS = [
  { label: "Early morning", time: "07:00" },
  { label: "Lunch break", time: "11:30" },
  { label: "Afternoon peak", time: "14:30" },
  { label: "Post-work", time: "18:00" },
  { label: "Night scroll", time: "21:00" },
] as const;

export const TIMEZONE = "America/New_York";

// ---------------------------------------------------------------------------
// Caption generator
// ---------------------------------------------------------------------------

const FALLBACK_CAPTIONS = [
  "This type of rizz needs to be studied fr 😭",
  "She was NOT ready for that last text 💀",
  "Bro turned a dead convo into a whole date 🔥",
  "The way she just handed over her number 😭",
  "Nah this is actually insane rizz",
  "She went from dry texts to dropping digits 😮‍💨",
  "This convo went from 0 to 100 real quick 🔥",
  "He really said the perfect thing every time 💀",
  "She folded after that one text 😭",
  "This is what peak texting looks like fr",
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Core hashtags on every post + a rotating pool to keep it fresh.
// 3-5 total per post — algorithm penalizes too many.
const ALWAYS_TAGS = ["#rizz"];
const ROTATING_TAGS = [
  "#rizzler",
  "#rizzking",
  "#textgame",
  "#pickuplines",
  "#datingadvice",
  "#rizzgod",
  "#texting",
  "#situationships",
  "#moderndating",
  "#datingtips",
];

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Generate a caption for a GodText AI video post.
 *
 * Format:
 *   <caption> @godtextai
 *   #rizz #fyp + 2-3 rotating niche tags
 *
 * If hookText is provided (from the script), it's used as the caption.
 * Otherwise a random fallback caption is picked.
 */
export function generateCaption(hookText?: string): string {
  const caption = hookText || pick(FALLBACK_CAPTIONS);
  const rotating = pickN(ROTATING_TAGS, 3);
  const tags = [...ALWAYS_TAGS, ...rotating].join(" ");
  return `${caption} @godtextai\n${tags}`;
}

// ---------------------------------------------------------------------------
// Video upload (3-step presigned URL flow)
// ---------------------------------------------------------------------------

type UploadInitResponse = {
  data: {
    media_id: string;
    upload_url: string;
    upload_method: { method: string; headers?: Record<string, string> };
    provider: string;
    expires_in: number;
  };
};

type UploadCompleteResponse = {
  data: {
    id: string;
    status: string;
    type: string;
    thumbnail_url?: string;
  };
};

/**
 * Upload a video to Post Everywhere from a public URL (e.g. Vercel Blob).
 *
 * 1. Download the video bytes from the source URL
 * 2. POST /media/upload to get a presigned upload URL
 * 3. PUT the bytes to the presigned URL
 * 4. POST /media/{id}/complete to finalize
 *
 * Returns the media_id ready for create_post.
 */
export async function uploadVideo(
  videoUrl: string,
  filename?: string,
): Promise<string> {
  // Step 0: Download the video from the source URL
  console.log(`[PE] Downloading video from ${videoUrl.slice(0, 80)}…`);
  const dlRes = await fetch(videoUrl);
  if (!dlRes.ok) throw new Error(`Failed to download video: HTTP ${dlRes.status}`);
  const videoBuffer = Buffer.from(await dlRes.arrayBuffer());
  const size = videoBuffer.byteLength;
  const name = filename || `godtext-${Date.now()}.mp4`;

  console.log(`[PE] Video size: ${(size / 1024 / 1024).toFixed(1)} MB`);

  // Step 1: Request presigned upload URL
  const initRes = await fetch(`${PE_BASE}/media/upload`, {
    method: "POST",
    headers: peHeaders(),
    body: JSON.stringify({
      filename: name,
      content_type: "video/mp4",
      size,
      width: 1080,
      height: 1920,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`PE upload init failed: ${initRes.status} — ${err}`);
  }
  const init: UploadInitResponse = await initRes.json();
  const mediaId = init.data.media_id;
  const uploadUrl = init.data.upload_url;
  console.log(`[PE] Got presigned URL, media_id=${mediaId}`);

  // Step 2: PUT the video bytes to the presigned URL
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4" },
    body: videoBuffer,
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`PE presigned PUT failed: ${putRes.status} — ${err}`);
  }
  console.log(`[PE] Video uploaded to storage`);

  // Step 3: Finalize the upload
  const completeRes = await fetch(`${PE_BASE}/media/${mediaId}/complete`, {
    method: "POST",
    headers: peHeaders(),
  });
  if (!completeRes.ok) {
    const err = await completeRes.text();
    throw new Error(`PE upload complete failed: ${completeRes.status} — ${err}`);
  }
  const complete: UploadCompleteResponse = await completeRes.json();
  console.log(`[PE] Upload finalized, status=${complete.data.status}`);

  return mediaId;
}

// ---------------------------------------------------------------------------
// Post scheduling
// ---------------------------------------------------------------------------

type CreatePostResponse = {
  id: string;
  status: string;
  content: string;
  scheduled_for?: string;
};

type PEPostResponse = {
  data?: CreatePostResponse;
  id?: string;
  status?: string;
  content?: string;
  scheduled_for?: string;
};

/**
 * Create a scheduled post on all three GodText AI accounts.
 *
 * @param mediaId  — PE media UUID from uploadVideo()
 * @param caption  — Post caption text
 * @param scheduledFor — ISO 8601 datetime (UTC) or undefined for immediate
 * @param youtubeTitle — Required title for YouTube Shorts
 */
export async function schedulePost(opts: {
  mediaId: string;
  caption: string;
  scheduledFor?: string;
  youtubeTitle?: string;
}): Promise<CreatePostResponse> {
  const { mediaId, caption, scheduledFor, youtubeTitle } = opts;

  const body: Record<string, unknown> = {
    content: caption,
    account_ids: ALL_ACCOUNT_IDS,
    media_ids: [mediaId],
    platform_content: {
      instagram: {
        content: caption,
        contentType: "Reels",
      },
      tiktok: {
        content: caption,
        settings: {
          privacyLevel: "PUBLIC_TO_EVERYONE",
          allowComments: true,
          allowDuet: true,
          allowStitch: true,
        },
      },
      youtube: {
        content: caption,
        settings: {
          title: youtubeTitle || "GodText AI — The Texting Cheat Code 🔥",
          privacyStatus: "public",
          tags: [
            "godtext",
            "godtext ai",
            "rizz",
            "texting",
            "dating",
            "texting tips",
            "dating advice",
            "ai",
            "ai app",
            "text game",
          ],
        },
      },
    },
    timezone: TIMEZONE,
  };

  if (scheduledFor) {
    body.scheduled_for = scheduledFor;
  }

  const res = await fetch(`${PE_BASE}/posts`, {
    method: "POST",
    headers: peHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PE create post failed: ${res.status} — ${err}`);
  }

  const raw: PEPostResponse = await res.json();
  // PE may wrap in { data: {...} } or return flat
  const post = raw.data || raw;
  return post as CreatePostResponse;
}

// ---------------------------------------------------------------------------
// Helpers for scheduling a full day
// ---------------------------------------------------------------------------

/**
 * Build Eastern-time datetimes for all 5 daily slots on a given date.
 *
 * Post Everywhere expects `scheduled_for` to be in the timezone specified by
 * the `timezone` field (we always send "America/New_York"). Do NOT convert to
 * UTC — PE applies the timezone offset itself, so converting would double-offset.
 *
 * @param dateStr — YYYY-MM-DD in Eastern time
 */
export function buildDaySchedule(dateStr: string): string[] {
  return DAILY_SLOTS.map((slot) => `${dateStr}T${slot.time}:00`);
}

// ---------------------------------------------------------------------------
// YouTube title generator
// ---------------------------------------------------------------------------

const YT_TITLES = [
  "GodText AI Made Her Give Her Number 😱",
  "She Wasn't Ready For GodText AI 💀",
  "GodText AI Is The Ultimate Wingman 🔥",
  "This AI Texting App Is A Cheat Code",
  "Watch GodText AI Cook The Perfect Text",
  "He Used GodText AI And She Said Yes 😭",
  "GodText AI Turned A Dead Convo Into A Date",
  "Proof That GodText AI Actually Works",
  "GodText AI: Stop Guessing What To Text",
  "Best Texting App For Guys — GodText AI",
  "GodText AI Rizz Is Unmatched 🎯",
  "She Thought He Was Smooth... It Was AI 💀",
  "GodText AI Closed In 5 Messages",
  "Never Get Left On Read Again — GodText AI",
  "This App Tells You Exactly What To Text 📲",
];

export function generateYoutubeTitle(): string {
  return pick(YT_TITLES);
}
