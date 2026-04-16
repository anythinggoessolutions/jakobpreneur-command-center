/**
 * Instagram Business Login OAuth 2.0 helpers — raw HTTP, no SDKs.
 * Uses the new Instagram Business Login API (not the old Facebook-based flow).
 */

// Instagram Business Login (new API)
const IG_AUTH_URL = "https://www.instagram.com/oauth/authorize";
const IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const IG_GRAPH_API = "https://graph.instagram.com";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

function getCredentials() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET must be set");
  }
  return { appId, appSecret };
}

export function getInstagramRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}/api/auth/instagram/callback`;
}

export function buildInstagramAuthUrl(redirectUri: string): string {
  const { appId } = getCredentials();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    state: Math.random().toString(36).substring(2),
  });
  return `${IG_AUTH_URL}?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string, redirectUri: string) {
  const { appId, appSecret } = getCredentials();

  // Exchange code for short-lived token
  const res = await fetch(IG_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const shortToken = data.access_token;
  const userId = data.user_id;

  // Exchange for long-lived token (60 days)
  try {
    const longRes = await fetch(
      `${IG_GRAPH_API}/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
    );

    if (longRes.ok) {
      const longData = await longRes.json();
      return {
        accessToken: longData.access_token || shortToken,
        expiresIn: longData.expires_in || 5184000,
        userId: String(userId),
      };
    }
  } catch {
    // Fall back to short-lived token
  }

  return { accessToken: shortToken, expiresIn: 3600, userId: String(userId) };
}

/**
 * Fetch the authenticated user's Instagram profile info.
 */
export async function fetchInstagramProfile(accessToken: string) {
  const res = await fetch(
    `${IG_GRAPH_API}/me?fields=user_id,username,profile_picture_url,name&access_token=${accessToken}`
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram profile fetch failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    userId: data.user_id || data.id,
    username: data.username || data.name || "Instagram User",
    profilePicture: data.profile_picture_url || "",
  };
}
