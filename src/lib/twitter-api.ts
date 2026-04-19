/**
 * Twitter/X OAuth 1.0a request signing for API calls.
 * Uses HMAC-SHA1 signature method.
 */

import crypto from "crypto";

function getOAuth1Credentials() {
  const consumerKey = process.env.TWITTER_CONSUMER_KEY;
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Twitter OAuth 1.0a credentials not set");
  }

  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function buildSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  // Build signature base string
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(sortedParams),
  ].join("&");

  // Build signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  // HMAC-SHA1
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

/**
 * Post a tweet via X API v2 using OAuth 1.0a.
 * Returns { tweet_id, url }.
 */
export async function postTweet(text: string): Promise<{ tweet_id: string; url: string }> {
  const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = getOAuth1Credentials();
  const url = "https://api.twitter.com/2/tweets";

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // OAuth 1.0a for v2 endpoints signs URL + method only (JSON body excluded)
  const signature = buildSignature("POST", url, oauthParams, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;

  const authHeader = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: text.slice(0, 280) }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twitter post failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const tweet_id = data?.data?.id || "";
  return {
    tweet_id,
    url: tweet_id ? `https://twitter.com/jakobpreneur/status/${tweet_id}` : "",
  };
}

/**
 * Make an authenticated request to the X API using OAuth 1.0a.
 */
export async function twitterApiRequest(url: string, method = "GET"): Promise<Response> {
  const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = getOAuth1Credentials();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  // Parse URL to separate base URL and query params
  const urlObj = new URL(url);
  const queryParams: Record<string, string> = {};
  urlObj.searchParams.forEach((v, k) => { queryParams[k] = v; });

  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  // OAuth parameters
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // All params for signature
  const allParams = { ...queryParams, ...oauthParams };

  // Generate signature
  const signature = buildSignature(method, baseUrl, allParams, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authHeader = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return fetch(url, {
    method,
    headers: { Authorization: authHeader },
  });
}
