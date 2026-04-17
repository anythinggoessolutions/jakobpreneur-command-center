import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { listRecords } from "@/lib/airtable";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ConnectionFields = {
  Platform?: string;
  "Access Token"?: string;
  Status?: string;
};

/**
 * POST /api/carousel/publish
 * Publishes a pre-rendered carousel (slideUrls) to Instagram as a carousel post.
 *
 * Body JSON: { slideUrls: string[], caption: string, cleanupBlobs?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slideUrls, caption, cleanupBlobs = true } = body;

    if (!Array.isArray(slideUrls) || slideUrls.length < 2 || slideUrls.length > 10) {
      return NextResponse.json(
        { error: "slideUrls must be 2-10 image URLs" },
        { status: 400 }
      );
    }

    // Get Instagram token
    const connections = await listRecords<ConnectionFields>("Connections");
    const ig = connections.find(
      (r) => r.fields.Platform === "Instagram" && r.fields.Status === "connected"
    );
    if (!ig) {
      return NextResponse.json({ error: "Instagram not connected" }, { status: 400 });
    }

    const accessToken = ig.fields["Access Token"] || "";

    // Get IG user ID
    const meRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id&access_token=${accessToken}`
    );
    const meData = await meRes.json();
    const igUserId = meData.user_id;
    if (!igUserId) {
      return NextResponse.json(
        { error: "Failed to fetch Instagram user ID", details: meData },
        { status: 500 }
      );
    }

    // Step 1: Create media container for each slide (as children)
    const childContainerIds: string[] = [];
    for (const url of slideUrls) {
      const containerRes = await fetch(`https://graph.instagram.com/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: url,
          is_carousel_item: "true",
          access_token: accessToken,
        }),
      });
      const containerData = await containerRes.json();
      if (!containerData.id) {
        throw new Error(`Child container failed: ${JSON.stringify(containerData).slice(0, 200)}`);
      }
      childContainerIds.push(containerData.id);
    }

    // Step 2: Create carousel container
    const carouselRes = await fetch(`https://graph.instagram.com/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        media_type: "CAROUSEL",
        children: childContainerIds.join(","),
        caption: (caption || "").slice(0, 2200),
        access_token: accessToken,
      }),
    });
    const carouselData = await carouselRes.json();
    if (!carouselData.id) {
      throw new Error(`Carousel container failed: ${JSON.stringify(carouselData).slice(0, 200)}`);
    }
    const carouselContainerId = carouselData.id;

    // Step 3: Publish
    const publishRes = await fetch(
      `https://graph.instagram.com/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: carouselContainerId,
          access_token: accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (!publishData.id) {
      throw new Error(`Publish failed: ${JSON.stringify(publishData).slice(0, 200)}`);
    }

    // Step 4: Clean up blobs
    if (cleanupBlobs) {
      await Promise.all(
        slideUrls.map(async (url) => {
          try {
            await del(url);
          } catch {
            // non-fatal
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      mediaId: publishData.id,
      url: `https://www.instagram.com/p/${publishData.id}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
