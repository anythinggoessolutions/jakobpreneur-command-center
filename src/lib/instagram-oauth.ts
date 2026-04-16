/**
 * Instagram/Meta OAuth 2.0 helpers — raw HTTP, no SDKs.
 * Instagram publishing goes through Facebook's OAuth + Graph API.
 */

const FB_AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const FB_TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const GRAPH_API = "https://graph.facebook.com/v21.0";

const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_read_engagement",
  "pages_show_list",
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
  return `${FB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string, redirectUri: string) {
  const { appId, appSecret } = getCredentials();

  // Exchange code for short-lived token
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${FB_TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const shortToken = data.access_token;

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(
    `${FB_TOKEN_URL}?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
  );

  if (!longRes.ok) {
    // Fall back to short-lived token
    return { accessToken: shortToken, expiresIn: data.expires_in || 3600 };
  }

  const longData = await longRes.json();
  return {
    accessToken: longData.access_token || shortToken,
    expiresIn: longData.expires_in || 5184000, // 60 days
  };
}

/**
 * Get the Instagram Business Account ID connected to the user's Facebook Pages.
 */
export async function fetchInstagramAccount(accessToken: string) {
  // 1. Get user's Facebook Pages
  const pagesRes = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
  );

  if (!pagesRes.ok) {
    const err = await pagesRes.text();
    throw new Error(`Failed to fetch Pages (${pagesRes.status}): ${err}`);
  }

  const pagesData = await pagesRes.json();
  const pages = pagesData.data || [];

  // 2. Find a page with an Instagram Business Account
  const pageWithIG = pages.find(
    (p: { instagram_business_account?: { id: string } }) => p.instagram_business_account
  );

  if (!pageWithIG || !pageWithIG.instagram_business_account) {
    throw new Error(
      "No Instagram Business account found. Make sure your Instagram is a Business/Creator account linked to a Facebook Page."
    );
  }

  const igAccountId = pageWithIG.instagram_business_account.id;

  // 3. Get Instagram account info
  const igRes = await fetch(
    `${GRAPH_API}/${igAccountId}?fields=id,username,profile_picture_url,name&access_token=${accessToken}`
  );

  if (!igRes.ok) {
    const err = await igRes.text();
    throw new Error(`Failed to fetch IG info (${igRes.status}): ${err}`);
  }

  const igData = await igRes.json();

  return {
    igAccountId: igData.id,
    username: igData.username || igData.name || "Instagram User",
    profilePicture: igData.profile_picture_url || "",
    pageId: pageWithIG.id,
    pageName: pageWithIG.name,
  };
}
