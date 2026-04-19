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
// Instagram Reels
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function publishVideoToInstagram(
  blobUrl: string,
  caption: string,
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
      const msg = statusData.error_message || statusData.status || "unknown";
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
