import { NextRequest, NextResponse } from "next/server";
import { generateScriptBundle } from "@/lib/script-generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120; // adaptive thinking + structured output can take 30-60s

/**
 * POST /api/scripts/generate
 *
 * Body: { toolName, toolUrl, partNumber?, hookType?, contentType?, reason? }
 * Returns: ScriptBundle (script + 5 tweets + carousel) — see script-generator.ts
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolName, toolUrl, partNumber, hookType, contentType, reason } = body;

    if (!toolName || !toolUrl) {
      return NextResponse.json(
        { error: "toolName and toolUrl are required" },
        { status: 400 },
      );
    }

    const bundle = await generateScriptBundle({
      toolName,
      toolUrl,
      partNumber,
      hookType,
      contentType,
      reason,
    });

    return NextResponse.json(bundle);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
