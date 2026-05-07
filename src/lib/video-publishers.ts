/**
 * Video publishers — post a video (already hosted on Vercel Blob) to YouTube
 * and Instagram Reels from the serverless runtime.
 *
 * Mirrors `pipeline/publishers.py` but runs on Vercel so the cron can fire
 * scheduled videos without the Mac pipeline being online.
 *
 * Tokens live in Airtable `Connections` table:
 *   - YouTube: Access Token, Refresh Token, Token Expiry
 *   - Instagram: Access Token (long-lived)
 */

import { listRecords, updateRecord } from "@/lib/airtable";
import { put, del } from "@vercel/blob";
import { getValidTikTokToken } from "@/lib/tiktok-oauth";

type ConnectionFields = {
  Platform?: string;
  Status?: string;
  "Access Token"?: string;
  "Refresh Token"?: string;
  "Token Expiry"?: string;
};

async function getConnection(platform: string) {
  const records = await listRecords<ConnectionFields>("Connections");
  const rec = records.find(
    (r) => r.fields.Platform === platform && r.fields.Status === "connected",
  );
  if (!rec) throw new Error(`No connected ${platform} account`);
  return rec;
}

// ---------------------------------------------------------------------------
// YouTube
// ---------------------------------------------------------------------------

async function refreshYouTubeToken(): Promise<string> {
  const rec = await getConnection("YouTube");
  const refreshToken = rec.fields["Refresh Token"];
  if (!refreshToken) {
    throw new Error("No YouTube refresh token — reconnect in Publishing tab");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`YouTube token refresh failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  const accessToken = data.access_token as string;
  const expiresIn = (data.expires_in as number) ?? 3600;
  const expiry = new Date(Date.now() + expiresIn * 1000).toISOString();
  await updateRecord<ConnectionFields>("Connections", rec.id, {
    "Access Token": accessToken,
    "Token Expiry": expiry,
  });
  return accessToken;
}

async function getValidYouTubeToken(): Promise<string> {
  const rec = await getConnection("YouTube");
  const token = rec.fields["Access Token"];
  const expiry = rec.fields["Token Expiry"];
  if (!token) return refreshYouTubeToken();
  const expiryMs = expiry ? Date.parse(expiry) : 0;
  // Refresh if less than 5 min remaining
  if (!expiryMs || expiryMs - Date.now() < 5 * 60 * 1000) {
    return refreshYouTubeToken();
  }
  return token;
}

export async function publishVideoToYouTube(
  blobUrl: string,
  title: string,
  description: string,
): Promise<{ videoId: string; url: string }> {
  const token = await getValidYouTubeToken();

  const metadata = {
    snippet: {
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: ["shorts", "ai", "jakobpreneur"],
      categoryId: "28",
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };

  // Fetch the video bytes from Blob — we need the Content-Length for the
  // resumable upload init, and the body to stream into the upload URL.
  const videoRes = await fetch(blobUrl);
  if (!videoRes.ok) {
    throw new Error(`Failed to fetch video from Blob (${videoRes.status})`);
  }
  const videoBuf = Buffer.from(await videoRes.arrayBuffer());
  const fileSize = videoBuf.length;

  // Step 1: initiate resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(fileSize),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!initRes.ok) {
    throw new Error(`YouTube init failed (${initRes.status}): ${await initRes.text()}`);
  }
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return upload URL");

  // Step 2: upload the bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileSize),
    },
    body: videoBuf,
  });
  if (!uploadRes.ok) {
    throw new Error(`YouTube upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }
  const data = await uploadRes.json();
  const videoId = (data.id as string) || "";
  return {
    videoId,
    url: videoId ? `https://www.youtube.com/shorts/${videoId}` : "",
  };
}

// ---------------------------------------------------------------------------
// TikTok
// ---------------------------------------------------------------------------

const TIKTOK_INIT_VIDEO_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TIKTOK_INIT_CONTENT_URL =
  "https://open.tiktokapis.com/v2/post/publish/content/init/";
const TIKTOK_STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

async function pollTikTokPublishStatus(
  accessToken: string,
  publishId: string,
  timeoutMs: number = 120000,
): Promise<{ shareUrl?: string; postId?: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(TIKTOK_STATUS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (!res.ok) {
      throw new Error(
        `TikTok status fetch failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
      );
    }
    const data = await res.json();
    const status = data?.data?.status as string | undefined;
    if (status === "PUBLISH_COMPLETE") {
      // TikTok's status response includes publicaly_available_post_id and
      // sometimes a share URL. Both are best-effort; absence is not fatal.
      const postId =
        (data?.data?.publicaly_available_post_id?.[0] as string | undefined) ||
        (data?.data?.publicly_available_post_id?.[0] as string | undefined);
      const shareUrl = data?.data?.share_url as string | undefined;
      return { postId, shareUrl };
    }
    if (status === "FAILED") {
      const reason =
        data?.data?.fail_reason ||
        data?.error?.message ||
        JSON.stringify(data).slice(0, 300);
      throw new Error(`TikTok publish FAILED: ${reason}`);
    }
    // Other statuses (PROCESSING_DOWNLOAD / PROCESSING_UPLOAD) → keep polling.
  }
  throw new Error("TikTok publish status timed out after 2min");
}

export async function publishVideoToTikTok(
  blobUrl: string,
  title: string,
): Promise<{ publishId: string; postId?: string; url?: string }> {
  const accessToken = await getValidTikTokToken();

  const initRes = await fetch(TIKTOK_INIT_VIDEO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 2200),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: blobUrl,
      },
    }),
  });

  if (!initRes.ok) {
    const text = (await initRes.text()).slice(0, 500);
    // Common cause: the Vercel Blob domain isn't in TikTok's URL Properties
    // verified-domain list. Surface this hint in the error so the user knows
    // exactly which lever to pull in the TikTok dev portal.
    const hint = /url|domain|prefix/i.test(text)
      ? " (likely cause: blob domain `*.public.blob.vercel-storage.com` not verified in TikTok dev portal → URL Properties)"
      : "";
    throw new Error(`TikTok video init failed (${initRes.status}): ${text}${hint}`);
  }

  const initData = await initRes.json();
  if (initData.error?.code && initData.error.code !== "ok") {
    throw new Error(
      `TikTok video init error: ${initData.error.code} - ${initData.error.message}`,
    );
  }
  const publishId = initData?.data?.publish_id as string | undefined;
  if (!publishId) {
    throw new Error(
      `TikTok video init: no publish_id (${JSON.stringify(initData).slice(0, 300)})`,
    );
  }

  const result = await pollTikTokPublishStatus(accessToken, publishId);
  return {
    publishId,
    postId: result.postId,
    url: result.shareUrl,
  };
}

export async function publishCarouselToTikTok(
  slideUrls: string[],
  title: string,
  description: string = "",
): Promise<{ publishId: string; postId?: string; url?: string }> {
  if (slideUrls.length < 1 || slideUrls.length > 35) {
    throw new Error(
      `TikTok photo carousel requires 1-35 images (got ${slideUrls.length})`,
    );
  }
  const accessToken = await getValidTikTokToken();

  const initRes = await fetch(TIKTOK_INIT_CONTENT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 90),
        description: description.slice(0, 2200),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_comment: false,
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: slideUrls,
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });

  if (!initRes.ok) {
    const text = (await initRes.text()).slice(0, 500);
    const hint = /url|domain|prefix/i.test(text)
      ? " (likely cause: blob domain `*.public.blob.vercel-storage.com` not verified in TikTok dev portal → URL Properties)"
      : "";
    throw new Error(`TikTok carousel init failed (${initRes.status}): ${text}${hint}`);
  }

  const initData = await initRes.json();
  if (initData.error?.code && initData.error.code !== "ok") {
    throw new Error(
      `TikTok carousel init error: ${initData.error.code} - ${initData.error.message}`,
    );
  }
  const publishId = initData?.data?.publish_id as string | undefined;
  if (!publishId) {
    throw new Error(
      `TikTok carousel init: no publish_id (${JSON.stringify(initData).slice(0, 300)})`,
    );
  }

  const result = await pollTikTokPublishStatus(accessToken, publishId);
  return {
    publishId,
    postId: result.postId,
    url: result.shareUrl,
  };
}

// ---------------------------------------------------------------------------
// Instagram Reels
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Duplicate a blob to a fresh URL. IG's fetcher caches failed URLs; re-fetching
 * from a new URL unsticks the rare transient fetch race.
 */
async function freshenBlob(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error(`blob refetch failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const name = `video-retry-${Date.now()}.mp4`;
  const fresh = await put(name, buf, {
    access: "public",
    addRandomSuffix: false,
    contentType: "video/mp4",
  });
  return fresh.url;
}

export async function publishVideoToInstagram(
  blobUrl: string,
  caption: string,
  _retry: boolean = true,
): Promise<{ mediaId: string; url: string }> {
  const rec = await getConnection("Instagram");
  const accessToken = rec.fields["Access Token"];
  if (!accessToken) throw new Error("No Instagram access token");

  // Get IG user_id
  const meRes = await fetch(
    `https://graph.instagram.com/me?fields=user_id&access_token=${accessToken}`,
  );
  const meData = await meRes.json();
  const igUserId = meData.user_id;
  if (!igUserId) throw new Error(`Instagram /me failed: ${JSON.stringify(meData).slice(0, 200)}`);

  // Create Reel container
  const containerRes = await fetch(`https://graph.instagram.com/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      media_type: "REELS",
      video_url: blobUrl,
      caption: caption.slice(0, 2200),
      access_token: accessToken,
    }),
  });
  if (!containerRes.ok) {
    throw new Error(
      `Instagram container failed (${containerRes.status}): ${(await containerRes.text()).slice(0, 200)}`,
    );
  }
  const containerData = await containerRes.json();
  const containerId = containerData.id;
  if (!containerId) throw new Error(`Instagram container: no id (${JSON.stringify(containerData).slice(0, 200)})`);

  // Poll until FINISHED (up to ~2 min)
  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const statusRes = await fetch(
      `https://graph.instagram.com/${containerId}?fields=status_code,status,error_message&access_token=${accessToken}`,
    );
    const statusData = await statusRes.json();
    if (statusData.status_code === "FINISHED") break;
    if (statusData.status_code === "ERROR") {
      const msg = (statusData.error_message || statusData.status || "unknown") as string;
      const isFetchFailure =
        /fetch|download|404/i.test(msg);
      // Transient IG fetcher race — re-upload to a new URL and retry once.
      if (_retry && isFetchFailure) {
        try {
          const freshUrl = await freshenBlob(blobUrl);
          try {
            const out = await publishVideoToInstagram(freshUrl, caption, false);
            // Best-effort cleanup of the retry blob and the original
            try { await del(freshUrl); } catch {}
            try { await del(blobUrl); } catch {}
            return out;
          } catch (retryErr) {
            try { await del(freshUrl); } catch {}
            throw retryErr;
          }
        } catch (freshenErr) {
          throw new Error(
            `Instagram container processing failed: ${msg} (retry failed: ${freshenErr instanceof Error ? freshenErr.message : String(freshenErr)})`,
          );
        }
      }
      throw new Error(`Instagram container processing failed: ${msg}`);
    }
  }

  // Publish
  const publishRes = await fetch(`https://graph.instagram.com/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });
  if (!publishRes.ok) {
    throw new Error(
      `Instagram publish failed (${publishRes.status}): ${(await publishRes.text()).slice(0, 200)}`,
    );
  }
  const publishData = await publishRes.json();
  const mediaId = publishData.id || "";
  return {
    mediaId,
    url: mediaId ? `https://www.instagram.com/reel/${mediaId}` : "",
  };
}
