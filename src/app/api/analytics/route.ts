import { NextResponse } from "next/server";
import { listRecords } from "@/lib/airtable";

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

async function fetchXStats(): Promise<Partial<PlatformStats>> {
  // Use OAuth 1.0a tokens from env to get user stats
  const consumerKey = process.env.TWITTER_CONSUMER_KEY;
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return { error: "X API tokens not configured" };
  }

  try {
    // Use Bearer token for read-only access (simpler than OAuth 1.0a signing)
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) return { error: "Bearer token not set" };

    const decodedBearer = decodeURIComponent(bearerToken);

    // Get authenticated user info
    const res = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url",
      { headers: { Authorization: `Bearer ${decodedBearer}` } }
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
      } else if (platform === "YouTube" && token) {
        const stats = await fetchYouTubeStats(token);
        results.push({ ...base, ...stats });
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
