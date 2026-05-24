import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PE_BASE = "https://app.posteverywhere.ai/api/v1";

/**
 * GET /api/godtext/post-everywhere/posts?status=scheduled|published
 *
 * Proxies the Post Everywhere /posts endpoint so the client-side
 * Content Calendar can list scheduled and published posts.
 */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "scheduled";
    const key = process.env.POST_EVERYWHERE_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "POST_EVERYWHERE_API_KEY not set" },
        { status: 500 },
      );
    }

    const url = new URL(`${PE_BASE}/posts`);
    url.searchParams.set("status", status);
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
    // PE returns { data: [...] } or an array — normalize
    const posts = Array.isArray(data) ? data : data.data || data.posts || [];

    return NextResponse.json({ posts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
