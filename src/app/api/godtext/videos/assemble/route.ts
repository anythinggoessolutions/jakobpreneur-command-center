import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "module";
import path from "path";
import { listRecords } from "@/lib/airtable";
import { assembleVideo, type AssemblyInput } from "@/lib/godtext-video-assembler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Video assembly can take several minutes — the pipeline does many
// Playwright screenshots + FFmpeg encodes sequentially.
export const maxDuration = 600;

type HypeFields = { "Video URL"?: string; "Clip Type"?: string };
type MusicFields = { "Audio URL"?: string };

/**
 * POST /api/godtext/videos/assemble
 *
 * Body: {
 *   conversation: GodTextConversation  (from the generate step)
 *   theme?: "white" | "dark"           (default "dark")
 * }
 *
 * LOCAL ONLY — this route depends on Playwright (headless Chromium) and
 * FFmpeg, neither of which exist on Vercel's serverless runtime. The
 * route returns 501 if Playwright can't be loaded.
 */
export async function POST(req: NextRequest) {
  try {
    // Quick guard: fail fast if Playwright isn't available.
    // We use process.cwd() + a fake filename because import.meta.url
    // can resolve to a Turbopack virtual path that can't find node_modules.
    try {
      const nodeRequire = createRequire(
        path.join(process.cwd(), "__pw_check__.js"),
      );
      nodeRequire(["play", "wright"].join(""));
    } catch {
      return NextResponse.json(
        {
          error:
            "Playwright is not installed. Run: npm install -D playwright && npx playwright install chromium",
        },
        { status: 501 },
      );
    }

    const body = await req.json();
    const { conversation, theme } = body as {
      conversation?: AssemblyInput["conversation"];
      theme?: "white" | "dark";
    };

    if (!conversation || !conversation.messages || !conversation.platform) {
      return NextResponse.json(
        { error: "conversation object required (with messages and platform)" },
        { status: 400 },
      );
    }

    // Fetch hype clips and music from Airtable vaults
    const [hypeRecords, musicRecords] = await Promise.all([
      listRecords<HypeFields>("GodText Hype Clips"),
      listRecords<MusicFields>("GodText Music"),
    ]);

    const hypeClipUrls = hypeRecords
      .filter((r) => r.fields["Video URL"])
      .map((r) => ({
        url: r.fields["Video URL"]!,
        clipType: (r.fields["Clip Type"] as string) || "Hype Clip",
        escalation: "any",
      }));

    // Pick a random music track
    const musicUrls = musicRecords
      .map((r) => r.fields["Audio URL"])
      .filter((u): u is string => typeof u === "string" && u.length > 0);
    const musicUrl =
      musicUrls.length > 0
        ? musicUrls[Math.floor(Math.random() * musicUrls.length)]
        : undefined;

    const result = await assembleVideo({
      conversation,
      theme,
      hypeClipUrls,
      musicUrl,
    });

    return NextResponse.json({
      success: true,
      outputPath: result.outputPath,
      durationSeconds: Math.round(result.durationSeconds * 10) / 10,
      frameCount: result.frameCount,
      warnings: result.warnings,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Video assembly failed:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
