import { NextRequest, NextResponse } from "next/server";
import { listRecords, updateRecord } from "@/lib/airtable";
import { postTweet } from "@/lib/twitter-api";
import { renderCarousel } from "@/lib/carousel-renderer";
import { put, del } from "@vercel/blob";
import {
  publishVideoToYouTube,
  publishVideoToInstagram,
} from "@/lib/video-publishers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // Pro tier — generous headroom for carousel renders + IG API

type TweetFields = {
  Text?: string;
  "Scheduled Time"?: string;
  Status?: string;
  "Posted At"?: string;
  "Tweet ID"?: string;
  "Tweet URL"?: string;
  Error?: string;
  "Source Job ID"?: string;
};

type VideoFields = {
  "Tool Name"?: string;
  "File Path"?: string;
  Status?: string;
  "Scheduled Time"?: string;
  "IG Caption"?: string;
  "Theme Tag"?: string;
  "Posted ID"?: string;
  "Posted URL"?: string;
  "Posted At"?: string;
  Error?: string;
};

type ConnectionFields = {
  Platform?: string;
  "Access Token"?: string;
  Status?: string;
};

/**
 * GET /api/cron/fire-due
 *
 * Vercel cron entrypoint. Fires:
 *  - Tweets in the Tweets table whose Scheduled Time has passed and Status="scheduled"
 *  - Carousels in the Videos table (Theme Tag="carousel") whose Scheduled Time has
 *    passed and Status="scheduled"
 *
 * Auth: Vercel cron requests carry "x-vercel-cron". Manual triggers must include
 * `Authorization: Bearer ${CRON_SECRET}` if CRON_SECRET is set.
 */
export async function GET(req: NextRequest) {
  // Auth — accept Vercel cron header OR explicit bearer secret
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  const auth = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  const hasValidBearer = secret && auth === `Bearer ${secret}`;
  if (!isVercelCron && !hasValidBearer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary = {
    tweets: { fired: 0, failed: 0, skipped: 0, results: [] as unknown[] },
    carousels: { fired: 0, failed: 0, skipped: 0, results: [] as unknown[] },
    videos: { fired: 0, failed: 0, skipped: 0, results: [] as unknown[] },
  };

  // ---------- Tweets ----------
  try {
    const tweetRecords = await listRecords<TweetFields>("Tweets");
    const dueTweets = tweetRecords.filter((r) => {
      if (r.fields.Status !== "scheduled") return false;
      const scheduled = r.fields["Scheduled Time"];
      if (!scheduled) return false;
      return new Date(scheduled) <= now;
    });

    for (const rec of dueTweets) {
      const text = rec.fields.Text || "";
      if (!text) {
        await updateRecord<TweetFields>("Tweets", rec.id, {
          Status: "failed",
          Error: "empty Text field",
        });
        summary.tweets.skipped++;
        continue;
      }
      try {
        const result = await postTweet(text);
        await updateRecord<TweetFields>("Tweets", rec.id, {
          Status: "posted",
          "Tweet ID": result.tweet_id,
          "Tweet URL": result.url,
          "Posted At": now.toISOString(),
        });
        summary.tweets.fired++;
        summary.tweets.results.push({ id: rec.id, tweet_id: result.tweet_id, url: result.url });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateRecord<TweetFields>("Tweets", rec.id, {
          Status: "failed",
          Error: msg.slice(0, 500),
        });
        summary.tweets.failed++;
        summary.tweets.results.push({ id: rec.id, error: msg });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.tweets.results.push({ fatal: msg });
  }

  // ---------- Carousels ----------
  try {
    const videoRecords = await listRecords<VideoFields>("Videos");
    const dueCarousels = videoRecords.filter((r) => {
      if (r.fields["Theme Tag"] !== "carousel") return false;
      if (r.fields.Status !== "scheduled") return false;
      const scheduled = r.fields["Scheduled Time"];
      if (!scheduled) return false;
      return new Date(scheduled) <= now;
    });

    // Pre-load IG token once
    let igAccessToken = "";
    let igUserId = "";
    if (dueCarousels.length > 0) {
      const connections = await listRecords<ConnectionFields>("Connections");
      const ig = connections.find(
        (r) => r.fields.Platform === "Instagram" && r.fields.Status === "connected",
      );
      if (ig) {
        igAccessToken = ig.fields["Access Token"] || "";
        const meRes = await fetch(
          `https://graph.instagram.com/me?fields=user_id&access_token=${igAccessToken}`,
        );
        const meData = await meRes.json();
        igUserId = meData.user_id || "";
      }
    }

    for (const rec of dueCarousels) {
      try {
        if (!igAccessToken || !igUserId) {
          throw new Error("Instagram not connected");
        }

        const specJson = rec.fields["File Path"] || "";
        if (!specJson) throw new Error("missing carousel spec in File Path");
        const spec = JSON.parse(specJson) as {
          headline?: string;
          slides?: string[];
          toolName?: string;
          carouselType?: "famous_person" | "tool_breakdown";
          toolUrl?: string;
        };
        if (!spec.headline || !Array.isArray(spec.slides) || spec.slides.length === 0) {
          throw new Error("carousel spec missing headline or slides");
        }

        // Render slides
        const buffers = renderCarousel({
          headline: spec.headline,
          slides: spec.slides,
          toolName: spec.toolName,
          carouselType: spec.carouselType,
        });

        // Upload to Blob
        const timestamp = Date.now();
        const slideUrls = await Promise.all(
          buffers.map(async (buffer, i) => {
            const blob = await put(
              `carousel-${timestamp}-slide-${i + 1}.png`,
              buffer,
              { access: "public", addRandomSuffix: false, contentType: "image/png" },
            );
            return blob.url;
          }),
        );

        // Build IG caption
        const caption = (rec.fields["IG Caption"] || buildFallbackCaption(spec)).slice(0, 2200);

        // Create child containers
        const childContainerIds: string[] = [];
        for (const url of slideUrls) {
          const res = await fetch(`https://graph.instagram.com/${igUserId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              image_url: url,
              is_carousel_item: "true",
              access_token: igAccessToken,
            }),
          });
          const data = await res.json();
          if (!data.id) throw new Error(`child container failed: ${JSON.stringify(data).slice(0, 200)}`);
          childContainerIds.push(data.id);
        }

        // Create carousel container
        const carouselRes = await fetch(`https://graph.instagram.com/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            media_type: "CAROUSEL",
            children: childContainerIds.join(","),
            caption,
            access_token: igAccessToken,
          }),
        });
        const carouselData = await carouselRes.json();
        if (!carouselData.id) {
          throw new Error(`carousel container failed: ${JSON.stringify(carouselData).slice(0, 200)}`);
        }

        // Wait until IG finishes assembling the container before publishing.
        // Without this, media_publish returns "Media ID is not available"
        // (error 2207027) because IG's async pipeline hasn't caught up.
        let containerReady = false;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const sRes = await fetch(
            `https://graph.instagram.com/${carouselData.id}?fields=status_code,status,error_message&access_token=${igAccessToken}`,
          );
          const sData = await sRes.json();
          if (sData.status_code === "FINISHED") {
            containerReady = true;
            break;
          }
          if (sData.status_code === "ERROR") {
            const msg = sData.error_message || sData.status || "unknown";
            throw new Error(`carousel container processing failed: ${msg}`);
          }
        }
        if (!containerReady) {
          throw new Error("carousel container did not finish in 2min");
        }

        // Publish
        const publishRes = await fetch(
          `https://graph.instagram.com/${igUserId}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              creation_id: carouselData.id,
              access_token: igAccessToken,
            }),
          },
        );
        const publishData = await publishRes.json();
        if (!publishData.id) {
          throw new Error(`publish failed: ${JSON.stringify(publishData).slice(0, 200)}`);
        }

        // Cleanup blobs
        await Promise.all(
          slideUrls.map(async (url) => {
            try {
              await del(url);
            } catch {
              // non-fatal
            }
          }),
        );

        await updateRecord<VideoFields>("Videos", rec.id, {
          Status: "posted",
          "Posted ID": publishData.id,
          "Posted URL": `https://www.instagram.com/p/${publishData.id}`,
          "Posted At": now.toISOString(),
        });
        summary.carousels.fired++;
        summary.carousels.results.push({ id: rec.id, mediaId: publishData.id });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateRecord<VideoFields>("Videos", rec.id, {
          Status: "failed",
          Error: msg.slice(0, 500),
        });
        summary.carousels.failed++;
        summary.carousels.results.push({ id: rec.id, error: msg });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.carousels.results.push({ fatal: msg });
  }

  // ---------- Videos ----------
  // Scheduled videos flow: attempt each requested platform (YouTube, Instagram).
  // Track per-platform success in the spec's `pendingPlatforms`. All platforms
  // succeed → status=posted, blob deleted. Some succeed → status=partial, blob
  // kept for next tick's retry. After 3 failed attempts → status=failed (blob
  // kept so user can investigate and manually retry).
  const MAX_VIDEO_ATTEMPTS = 3;
  try {
    const videoRecords = await listRecords<VideoFields>("Videos");
    const dueVideos = videoRecords.filter((r) => {
      if (r.fields["Theme Tag"] !== "video") return false;
      const s = r.fields.Status;
      if (s !== "scheduled" && s !== "partial") return false;
      const scheduled = r.fields["Scheduled Time"];
      if (!scheduled) return false;
      return new Date(scheduled) <= now;
    });

    for (const rec of dueVideos) {
      try {
        const specJson = rec.fields["File Path"] || "";
        if (!specJson) throw new Error("missing video spec in File Path");
        const spec = JSON.parse(specJson) as {
          blobUrl?: string;
          ytTitle?: string;
          ytDescription?: string;
          platforms?: string[];
          pendingPlatforms?: string[];
          attemptCount?: number;
        };
        if (!spec.blobUrl) throw new Error("spec missing blobUrl");

        const allPlatforms = spec.platforms || [];
        // Back-compat: if pendingPlatforms wasn't stored, assume all are pending
        const pending = spec.pendingPlatforms || [...allPlatforms];
        const attemptCount = (spec.attemptCount || 0) + 1;

        const stillPending: string[] = [];
        const postResults: Record<string, unknown> = {};
        let postedUrl = "";
        let postedId = "";

        // YouTube
        if (pending.includes("YouTube")) {
          try {
            const yt = await publishVideoToYouTube(
              spec.blobUrl,
              spec.ytTitle || rec.fields["Tool Name"] || "",
              spec.ytDescription || "",
            );
            postResults.youtube = { success: true, ...yt };
            if (yt.url) {
              postedUrl = yt.url;
              postedId = yt.videoId;
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            postResults.youtube = { success: false, error: msg };
            stillPending.push("YouTube");
          }
        }

        // Instagram
        if (pending.includes("Instagram")) {
          try {
            const ig = await publishVideoToInstagram(
              spec.blobUrl,
              rec.fields["IG Caption"] || "",
            );
            postResults.instagram = { success: true, ...ig };
            if (!postedUrl && ig.url) {
              postedUrl = ig.url;
              postedId = ig.mediaId;
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            postResults.instagram = { success: false, error: msg };
            stillPending.push("Instagram");
          }
        }

        if (stillPending.length === 0) {
          // Everything succeeded — delete blob, mark posted.
          try { await del(spec.blobUrl); } catch {}
          await updateRecord<VideoFields>("Videos", rec.id, {
            Status: "posted",
            "Posted ID": postedId,
            "Posted URL": postedUrl,
            "Posted At": now.toISOString(),
          });
          summary.videos.fired++;
          summary.videos.results.push({ id: rec.id, results: postResults });
        } else if (attemptCount >= MAX_VIDEO_ATTEMPTS) {
          // Too many retries — keep blob for manual inspection, mark failed.
          const newSpec = { ...spec, pendingPlatforms: stillPending, attemptCount };
          await updateRecord<VideoFields>("Videos", rec.id, {
            Status: "failed",
            "File Path": JSON.stringify(newSpec),
            Error:
              `${stillPending.join(",")} failed after ${attemptCount} attempts: ` +
              JSON.stringify(postResults).slice(0, 400),
          });
          summary.videos.failed++;
          summary.videos.results.push({ id: rec.id, error: "max attempts reached", results: postResults });
        } else {
          // Some succeeded — retry remaining on next cron tick.
          const newSpec = { ...spec, pendingPlatforms: stillPending, attemptCount };
          await updateRecord<VideoFields>("Videos", rec.id, {
            Status: "partial",
            "File Path": JSON.stringify(newSpec),
            Error: JSON.stringify(postResults).slice(0, 500),
          });
          summary.videos.skipped++;
          summary.videos.results.push({
            id: rec.id,
            partial: true,
            pending: stillPending,
            attemptCount,
            results: postResults,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateRecord<VideoFields>("Videos", rec.id, {
          Status: "failed",
          Error: msg.slice(0, 500),
        });
        summary.videos.failed++;
        summary.videos.results.push({ id: rec.id, error: msg });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    summary.videos.results.push({ fatal: msg });
  }

  return NextResponse.json({ ranAt: now.toISOString(), ...summary });
}

function buildFallbackCaption(spec: { toolName?: string; headline?: string; toolUrl?: string }): string {
  const parts: string[] = [];
  if (spec.headline) parts.push(spec.headline);
  if (spec.toolName) parts.push(`\n\n${spec.toolName}`);
  if (spec.toolUrl) parts.push(`\n${spec.toolUrl}`);
  parts.push("\n\nFollow @jakobpreneur for more.");
  return parts.join("");
}
