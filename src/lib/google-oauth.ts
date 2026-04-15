/**
 * Google OAuth 2.0 helpers for YouTube — raw HTTP, no SDKs.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

function getCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local");
  }
  return { clientId, clientSecret };
}

/**
 * Build the redirect URI dynamically from the incoming request.
 * This way it works for localhost, Vercel preview, and custom domain.
 */
export function getRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}/api/auth/youtube/callback`;
}

/**
 * Build the Google OAuth consent URL.
 */
export function buildAuthUrl(redirectUri: string): string {
  const { clientId } = getCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",      // get a refresh_token
    prompt: "consent",           // always show consent to ensure refresh_token
    include_granted_scopes: "true",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getCredentials();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number,
    tokenType: data.token_type as string,
  };
}

/**
 * Fetch the authenticated user's YouTube channel info.
 */
export async function fetchChannelInfo(accessToken: string) {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Channel fetch failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) throw new Error("No YouTube channel found for this account");

  return {
    channelId: channel.id as string,
    channelName: channel.snippet.title as string,
    channelThumbnail: channel.snippet.thumbnails?.default?.url as string,
  };
}
