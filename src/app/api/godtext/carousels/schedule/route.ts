import { NextRequest, NextResponse } from "next/server";
import { generateCaption } from "@/lib/post-everywhere";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const maxDuration = 120;

const PE_BASE = "https://app.posteverywhere.ai/api/v1";

// Carousel goes to TikTok + Instagram only (no YouTube — video only)
const CAROUSEL_ACCOUNT_IDS = [6124, 6127]; // Instagram, TikTok
const TIMEZONE = "America/New_York";

function peHeaders(): Record<string, string> {
  const key = process.env.POST_EVERYWHERE_API_KEY;
  if (!key) throw new Error("POST_EVERYWHERE_API_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/**
 * Upload an image from a public URL to PostEverywhere's media library.
 * Returns the media UUID.
 */
async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(`${PE_BASE}/media/upload/url`, {
    method: "POST",
    headers: peHeaders(),
    body: JSON.stringify({ url: imageUrl }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PE image upload failed: ${res.status} — ${err}`);
  }
  const data = await res.json();
  // PE may wrap in { data: { media_id } } or flat
  const mediaId = data?.data?.media_id || data?.media_id;
  if (!mediaId) {
    throw new Error(`PE image upload returned no media_id: ${JSON.stringify(data)}`);
  }
  return mediaId;
}

/**
 * POST /api/godtext/carousels/schedule
 *
 * Uploads carousel slide images to Post Everywhere and schedules
 * the carousel post to TikTok + Instagram.
 *
 * Body:
 *   slideUrls    — array of public image URLs (Vercel Blob)
 *   scheduledFor — ISO 8601 datetime (optional; omit for immediate)
 *   caption      — custom caption (optional; auto-generated if omitted)
 *   hookText     — hook text from the script (used for caption generation)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slideUrls, scheduledFor, caption, hookText } = body as {
      slideUrls?: string[];
      scheduledFor?: string;
      caption?: string;
      hookText?: string;
    };

    if (!slideUrls || slideUrls.length === 0) {
      return NextResponse.json(
        { error: "slideUrls array is required" },
        { status: 400 },
      );
    }

    // 1. Upload all slide images to PE
    console.log(`[Carousel Schedule] Uploading ${slideUrls.length} slides to PE...`);
    const mediaIds: string[] = [];
    for (const url of slideUrls) {
      const mediaId = await uploadImageFromUrl(url);
      mediaIds.push(mediaId);
      console.log(`[Carousel Schedule] Uploaded slide, media_id=${mediaId}`);
    }

    // 2. Generate caption
    const finalCaption = caption || generateCaption(hookText);

    // 3. Create the post with all images as a carousel
    const postBody: Record<string, unknown> = {
      content: finalCaption,
      account_ids: CAROUSEL_ACCOUNT_IDS,
      media_ids: mediaIds,
      platform_content: {
        instagram: {
          content: finalCaption,
          contentType: "Carousel",
        },
        tiktok: {
          content: finalCaption,
          settings: {
            privacyLevel: "PUBLIC_TO_EVERYONE",
            allowComments: true,
          },
        },
      },
      timezone: TIMEZONE,
    };

    if (scheduledFor) {
      postBody.scheduled_for = scheduledFor;
    }

    const res = await fetch(`${PE_BASE}/posts`, {
      method: "POST",
      headers: peHeaders(),
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PE create carousel post failed: ${res.status} — ${err}`);
    }

    const raw = await res.json();
    const post = raw.data || raw;

    return NextResponse.json({
      postId: post.id,
      status: post.status,
      scheduledFor: scheduledFor || "immediate",
      caption: finalCaption,
      slideCount: mediaIds.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Carousel Schedule] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
