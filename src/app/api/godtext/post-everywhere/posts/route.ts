import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PE_BASE = "https://app.posteverywhere.ai/api/v1";

type PEDestination = {
  status?: string;
  destination_status?: string;
  published_at?: string | null;
};

type PEPost = Record<string, unknown> & {
  destinations?: PEDestination[];
  scheduled_for?: string;
};

/**
 * GET /api/godtext/post-everywhere/posts?status=scheduled|published
 *
 * Proxies the Post Everywhere /posts endpoint so the client-side
 * Content Calendar can list scheduled and published posts.
 *
 * PE quirks:
 *  - The post-level `status` is always "scheduled" even after publishing.
 *  - The real publish state lives on each destination (status: "done").
 *  - PE ignores the `?status=` query param — it returns all posts.
 *  - Response shape: { data: { posts: [...] } }
 *
 * We fetch all posts, derive the true status from destinations, and
 * filter server-side based on what the UI asks for.
 */
export async function GET(req: NextRequest) {
  try {
    const wantStatus = req.nextUrl.searchParams.get("status") || "scheduled";
    const key = process.env.POST_EVERYWHERE_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "POST_EVERYWHERE_API_KEY not set" },
        { status: 500 },
      );
    }

    const url = new URL(`${PE_BASE}/posts`);
    url.searchParams.set("limit", "50");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `PE API error: ${res.status} — ${err}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Extract posts from PE's nested response shape
    let rawPosts: PEPost[] = [];
    if (Array.isArray(data)) {
      rawPosts = data;
    } else if (data.data && Array.isArray(data.data.posts)) {
      rawPosts = data.data.posts;
    } else if (Array.isArray(data.posts)) {
      rawPosts = data.posts;
    } else if (Array.isArray(data.data)) {
      rawPosts = data.data;
    }

    // Derive true status from destinations:
    //   - All destinations "done" → "published"
    //   - Any destination still "queued" → "scheduled"
    const enriched = rawPosts.map((p) => {
      const dests = p.destinations || [];
      const allDone =
        dests.length > 0 &&
        dests.every(
          (d) => (d.status || d.destination_status) === "done",
        );
      const trueStatus = allDone ? "published" : "scheduled";
      return { ...p, status: trueStatus };
    });

    // Filter to what the UI asked for
    const filtered = enriched.filter((p) => p.status === wantStatus);

    return NextResponse.json({ posts: filtered });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
