import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/instagram/deauth
 * Instagram sends a POST here when a user deauthorizes the app
 * or requests data deletion. We just acknowledge it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("Instagram deauth/deletion request:", body);

    // Return a confirmation URL and tracking code as required by Meta
    return NextResponse.json({
      url: "https://jakobprenuer.com/privacy",
      confirmation_code: `del_${Date.now()}`,
    });
  } catch {
    return NextResponse.json({ status: "ok" });
  }
}

export async function GET() {
  return NextResponse.json({ status: "active" });
}
