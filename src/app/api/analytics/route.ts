import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";
import { getValidYouTubeToken } from "@/lib/google-oauth";
import { getValidTikTokToken } from "@/lib/tiktok-oauth";
import { twitterApiRequest } from "@/lib/twitter-api";

export const dynamic = "force-dynamic";

type ConnectionFields = {
  Platform?: string;
  "Access Token"?: string;
  Status?: string;
  "Channel Name"?: string;
};

interface PlatformStats {
  platform: string;
  connected: boolean;
  username: string;
  followers: number | null;
  posts: number | null;
  views: number | null;
  engagement: string | null;
  subscribers: number | null;
  watchHours: number | null;
  impressions: number | null;
  error?: string;
}

async function fetchInstagramStats(accessToken: string): Promise<Partial<PlatformStats>> {
  try {
    // Get user profile with media count and followers
    const res = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,media_count,followers_count,follows_count&access_token=${accessToken}`
    );
    if (!res.ok) {
      const err = await res.text();
      return { error: `Instagram API error: ${err.slice(0, 100)}` };
    }
    const data = await res.json();
    return {
      followers: data.followers_count ?? null,
      posts: data.media_count ?? null,
      username: data.username || "",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchYouTubeStats(accessToken: string): Promise<Partial<PlatformStats>> {
  try {
    // Get channel stats
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const err = await res.text();
      return { error: `YouTube API error: ${err.slice(0, 100)}` };
    }
    const data = await res.json();
    const channel = data.items?.[0];
    if (!channel) return { error: "No YouTube channel found" };

    const stats = channel.statistics;
    return {
      subscribers: parseInt(stats.subscriberCount) || 0,
      views: parseInt(stats.viewCount) || 0,
      posts: parseInt(stats.videoCount) || 0,
      username: channel.snippet?.title || "",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchTikTokStats(accessToken: string): Promise<Partial<PlatformStats>> {
  try {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name,follower_count,following_count,likes_count,video_count",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const err = await res.text();
      return { error: `TikTok API error (${res.status}): ${err.slice(0, 100)}` };
    }
    const data = await res.json();
    const user = data?.data?.user;
    if (!user) return { error: "No TikTok user data returned" };

    // TikTok's likes_count is "total likes received across all videos" — the
    // closest analog to YouTube's lifetime view count. Surface it as `views`
    // so the existing UI card has a populated headline number.
    return {
      followers: user.follower_count ?? null,
      posts: user.video_count ?? null,
      views: user.likes_count ?? null,
      username: user.username || user.display_name || "",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchXStats(): Promise<Partial<PlatformStats>> {
  try {
    const res = await twitterApiRequest(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url"
    );

    if (!res.ok) {
      const err = await res.text();
      return { error: `X API error (${res.status}): ${err.slice(0, 100)}` };
    }

    const data = await res.json();
    const metrics = data.data?.public_metrics;

    return {
      followers: metrics?.followers_count ?? null,
      posts: metrics?.tweet_count ?? null,
      username: data.data?.username || "",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  try {
    // Get all connections from Airtable
    const connections = await listRecords<ConnectionFields>("Connections");

    const results: PlatformStats[] = [];

    for (const conn of connections) {
      const platform = conn.fields.Platform || "";
      const token = conn.fields["Access Token"] || "";
      const isConnected = conn.fields.Status === "connected";
      const username = conn.fields["Channel Name"] || "";

      if (!isConnected) continue;

      const base: PlatformStats = {
        platform,
        connected: true,
        username,
        followers: null,
        posts: null,
        views: null,
        engagement: null,
        subscribers: null,
        watchHours: null,
        impressions: null,
      };

      if (platform === "Instagram" && token) {
        const stats = await fetchInstagramStats(token);
        results.push({ ...base, ...stats });
      } else if (platform === "YouTube") {
        // Auto-refresh YouTube token if expired
        try {
          const freshToken = await getValidYouTubeToken();
          const stats = await fetchYouTubeStats(freshToken);
          results.push({ ...base, ...stats });
        } catch (err) {
          results.push({ ...base, error: err instanceof Error ? err.message : String(err) });
        }
      } else if (platform === "TikTok") {
        // Auto-refresh TikTok token (24h access, 365d refresh)
        try {
          const freshToken = await getValidTikTokToken();
          const stats = await fetchTikTokStats(freshToken);
          results.push({ ...base, ...stats });
        } catch (err) {
          results.push({ ...base, error: err instanceof Error ? err.message : String(err) });
        }
      } else if (platform === "X") {
        const stats = await fetchXStats();
        results.push({ ...base, ...stats });
      } else {
        results.push(base);
      }
    }

    return NextResponse.json({ platforms: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
