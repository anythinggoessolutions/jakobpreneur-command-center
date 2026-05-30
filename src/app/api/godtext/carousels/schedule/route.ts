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
 * Upload an image to PostEverywhere using the 3-step presigned URL flow.
 * Downloads the image from a public URL, then uploads via PE's presigned flow.
 */
async function uploadImage(imageUrl: string, index: number): Promise<string> {
  // Step 0: Download the image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
  const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get("content-type") || "image/png";

  // Step 1: Request presigned upload URL
  const filename = `godtext-carousel-slide-${index}-${Date.now()}.png`;
  const initRes = await fetch(`${PE_BASE}/media/upload`, {
    method: "POST",
    headers: peHeaders(),
    body: JSON.stringify({
      filename,
      content_type: contentType,
      size: imageBuffer.length,
      width: 1080,
      height: 1920,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`PE upload init failed: ${initRes.status} — ${err}`);
  }
  const init = await initRes.json();
  const mediaId = init?.data?.media_id;
  const uploadUrl = init?.data?.upload_url;
  if (!mediaId || !uploadUrl) {
    throw new Error(`PE upload init missing fields: ${JSON.stringify(init)}`);
  }

  // Step 2: PUT image bytes to the presigned URL
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: imageBuffer,
  });
  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`PE presigned PUT failed: ${putRes.status} — ${err}`);
  }

  // Step 3: Finalize the upload
  const completeRes = await fetch(`${PE_BASE}/media/${mediaId}/complete`, {
    method: "POST",
    headers: peHeaders(),
  });
  if (!completeRes.ok) {
    const err = await completeRes.text();
    throw new Error(`PE upload complete failed: ${completeRes.status} — ${err}`);
  }

  console.log(`[Carousel Schedule] Uploaded slide ${index}, media_id=${mediaId}`);
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

    // 1. Upload all slide images to PE via 3-step presigned URL flow
    console.log(`[Carousel Schedule] Uploading ${slideUrls.length} slides to PE...`);
    const mediaIds: string[] = [];
    for (let i = 0; i < slideUrls.length; i++) {
      const mediaId = await uploadImage(slideUrls[i], i);
      mediaIds.push(mediaId);
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
