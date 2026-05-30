import { NextRequest, NextResponse } from "next/server";
import {
  uploadVideo,
  schedulePost,
  generateCaption,
  generateYoutubeTitle,
} from "@/lib/post-everywhere";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Allow up to 120s for video download + PE upload + scheduling.
export const maxDuration = 120;

/**
 * POST /api/godtext/post-everywhere/schedule
 *
 * Uploads a GodText AI video to Post Everywhere and schedules it
 * to all three accounts (TikTok, Instagram Reels, YouTube Shorts).
 *
 * Body:
 *   videoUrl     — public Vercel Blob URL of the MP4
 *   scheduledFor — ISO 8601 UTC datetime (optional; omit for immediate)
 *   caption      — custom caption (optional; auto-generated if omitted)
 *   youtubeTitle — custom YT title (optional; auto-generated if omitted)
 *
 * Returns: { postId, status, scheduledFor, caption }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoUrl, scheduledFor, caption, youtubeTitle, hookText } = body as {
      videoUrl?: string;
      scheduledFor?: string;
      caption?: string;
      youtubeTitle?: string;
      hookText?: string;
    };

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 },
      );
    }

    // 1. Upload the video to Post Everywhere
    const mediaId = await uploadVideo(videoUrl);

    // 2. Generate caption and YT title if not provided
    const finalCaption = caption || generateCaption(hookText);
    const finalYtTitle = youtubeTitle || generateYoutubeTitle();

    // 3. Schedule the post
    const result = await schedulePost({
      mediaId,
      caption: finalCaption,
      scheduledFor,
      youtubeTitle: finalYtTitle,
    });

    return NextResponse.json({
      postId: result.id,
      status: result.status,
      scheduledFor: scheduledFor || "immediate",
      caption: finalCaption,
      youtubeTitle: finalYtTitle,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PE Schedule] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
