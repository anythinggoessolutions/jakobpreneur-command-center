/**
 * Twitter/X OAuth 2.0 with PKCE — raw HTTP, no SDKs.
 * Uses OAuth 2.0 Authorization Code Flow with PKCE for user authentication.
 */

import crypto from "crypto";

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

const SCOPES = "tweet.read tweet.write users.read offline.access";

function getCredentials() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

export function getTwitterRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}/api/auth/twitter/callback`;
}

/**
 * Generate PKCE code verifier and challenge.
 */
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// In-memory store for PKCE verifiers (fine for single-user app)
const pkceStore = new Map<string, string>();

export function buildTwitterAuthUrl(redirectUri: string): string {
  const { clientId } = getCredentials();
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString("hex");

  // Store verifier for use in callback
  pkceStore.set(state, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

export function getPKCEVerifier(state: string): string | undefined {
  const verifier = pkceStore.get(state);
  if (verifier) pkceStore.delete(state);
  return verifier;
}

export async function exchangeTwitterCode(code: string, redirectUri: string, codeVerifier: string) {
  const { clientId, clientSecret } = getCredentials();

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token exchange failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: data.expires_in as number,
  };
}

export async function fetchTwitterUser(accessToken: string) {
  const res = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter user fetch failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    id: data.data.id as string,
    username: data.data.username as string,
    name: data.data.name as string,
    profileImage: data.data.profile_image_url as string,
  };
}
