/**
 * TikTok OAuth 2.0 helpers — raw HTTP, no SDKs.
 */

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

const SCOPES = "user.info.basic,video.publish,video.upload";

function getCredentials() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be set");
  }
  return { clientKey, clientSecret };
}

export function getTikTokRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}/api/auth/tiktok/callback`;
}

export function buildTikTokAuthUrl(redirectUri: string): string {
  const { clientKey } = getCredentials();
  const csrfState = Math.random().toString(36).substring(2);
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state: csrfState,
  });
  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTikTokCode(code: string, redirectUri: string) {
  const { clientKey, clientSecret } = getCredentials();

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`TikTok error: ${data.error} - ${data.error_description}`);
  }

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: data.expires_in as number,
    openId: data.open_id as string,
  };
}

export async function fetchTikTokUserInfo(accessToken: string) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TikTok user info failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const user = data.data?.user;
  if (!user) throw new Error("No TikTok user data returned");

  return {
    displayName: user.display_name as string,
    avatarUrl: user.avatar_url as string,
    openId: user.open_id as string,
  };
}
