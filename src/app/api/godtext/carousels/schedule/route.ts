import { NextRequest, NextResponse } from "next/server";
import { generateCaption } from "@/lib/post-everywhere";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const maxDuration = 120;

const PE_BASE = "https://app.posteverywhere.ai/api/v1";

// Default: TikTok only (conversation carousels can exceed IG's 10-slide cap)
// Thirst trap carousels (6-9 slides) pass both TikTok + Instagram explicitly
const DEFAULT_ACCOUNT_IDS = [6127]; // TikTok
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
 * Upload an image to PostEverywhere using their image-from-URL import.
 *
 * PE uses Cloudflare Images for photos (not S3 presigned URLs like videos),
 * so the 3-step presigned PUT flow doesn't work for images. Instead we use
 * the /media/upload/image endpoint with a source_url field.
 *
 * If that fails, falls back to multipart form upload with the raw image bytes.
 */
async function uploadImage(imageUrl: string, index: number): Promise<string> {
  const key = process.env.POST_EVERYWHERE_API_KEY;
  if (!key) throw new Error("POST_EVERYWHERE_API_KEY not set");

  // Try URL-based import first (multiple possible endpoints)
  const urlEndpoints = [
    `${PE_BASE}/media/upload/image`,
    `${PE_BASE}/media/import`,
  ];

  for (const endpoint of urlEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: peHeaders(),
        body: JSON.stringify({
          url: imageUrl,
          source_url: imageUrl,
          filename: `carousel-slide-${index}.png`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const mediaId =
          data?.data?.media_id || data?.media_id || data?.data?.id || data?.id;
        if (mediaId) {
          console.log(
            `[Carousel Schedule] Uploaded slide ${index} via ${endpoint}, media_id=${mediaId}`,
          );
          return mediaId;
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  // Fallback: download image and upload as multipart form data
  console.log(
    `[Carousel Schedule] URL import failed, trying multipart upload for slide ${index}`,
  );
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok)
    throw new Error(`Failed to download image: ${imgRes.status}`);
  const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

  // Try presigned flow with POST instead of PUT
  const initRes = await fetch(`${PE_BASE}/media/upload`, {
    method: "POST",
    headers: peHeaders(),
    body: JSON.stringify({
      filename: `carousel-slide-${index}-${Date.now()}.png`,
      content_type: "image/png",
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
    throw new Error(
      `PE upload init missing fields: ${JSON.stringify(init)}`,
    );
  }

  // Try POST with form data to the presigned URL (Cloudflare Images style)
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([imageBuffer], { type: "image/png" }),
    `carousel-slide-${index}.png`,
  );

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(
      `PE image upload failed: ${uploadRes.status} — ${err}`,
    );
  }

  // Finalize
  const completeRes = await fetch(`${PE_BASE}/media/${mediaId}/complete`, {
    method: "POST",
    headers: peHeaders(),
  });
  if (!completeRes.ok) {
    const err = await completeRes.text();
    throw new Error(
      `PE upload complete failed: ${completeRes.status} — ${err}`,
    );
  }

  console.log(
    `[Carousel Schedule] Uploaded slide ${index} via multipart, media_id=${mediaId}`,
  );
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
    const { slideUrls, scheduledFor, caption, hookText, accountIds } = body as {
      slideUrls?: string[];
      scheduledFor?: string;
      caption?: string;
      hookText?: string;
      accountIds?: number[];
    };

    const finalAccountIds = accountIds?.length ? accountIds : DEFAULT_ACCOUNT_IDS;

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
      account_ids: finalAccountIds,
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
