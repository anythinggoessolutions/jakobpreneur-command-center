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
 * Use the refresh token to get a fresh access token.
 * YouTube access tokens expire every hour — this keeps the connection alive forever.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const { clientId, clientSecret } = getCredentials();

  const res = await fetch(GOOGLE_TOKEN_URL, {
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
    const err = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Get a valid access token — auto-refreshes if expired.
 * Reads from Airtable, checks expiry, refreshes if needed, updates Airtable.
 */
export async function getValidYouTubeToken(): Promise<string> {
  // Import here to avoid circular dependency
  const { listRecords, updateRecord } = await import("@/lib/airtable");

  type ConnectionFields = {
    Platform?: string;
    "Access Token"?: string;
    "Refresh Token"?: string;
    "Token Expiry"?: string;
    Status?: string;
  };

  const records = await listRecords<ConnectionFields>("Connections");
  const yt = records.find((r) => r.fields.Platform === "YouTube" && r.fields.Status === "connected");

  if (!yt) throw new Error("YouTube not connected");

  const accessToken = yt.fields["Access Token"] || "";
  const refreshToken = yt.fields["Refresh Token"] || "";
  const tokenExpiry = yt.fields["Token Expiry"] || "";

  if (!refreshToken) throw new Error("No refresh token stored — reconnect YouTube");

  // Check if token is expired (or will expire in next 5 minutes)
  const expiryDate = new Date(tokenExpiry);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (accessToken && expiryDate > fiveMinutesFromNow) {
    // Token is still valid
    return accessToken;
  }

  // Token expired — refresh it
  const refreshed = await refreshAccessToken(refreshToken);
  const newExpiry = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();

  // Save the new token back to Airtable
  await updateRecord<ConnectionFields>("Connections", yt.id, {
    "Access Token": refreshed.accessToken,
    "Token Expiry": newExpiry,
  });

  return refreshed.accessToken;
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
