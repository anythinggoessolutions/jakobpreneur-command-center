"use client";

/**
 * GodText AI — Frame Render Page
 *
 * This page is NOT for humans. It's the headless-screenshot target for
 * the video assembly pipeline. Playwright visits this URL with query
 * params, waits for fonts to load, then screenshots at 1080x1920.
 *
 * Query params:
 *   type      = "phone" | "cooking" | "hook"
 *   theme     = "white" | "dark"          (cooking only, default "dark")
 *   phase     = "cooking" | "reveal"      (cooking only, default "cooking")
 *   step      = 0 | 1 | 2                (cooking only — frozen loading step)
 *   platform  = "Hinge" | "Instagram" | "Tinder" | "iMessage"
 *   messages  = JSON-encoded ChatMessage[]
 *   hook      = hook text                 (hook frame only)
 *
 * The page renders at exactly 1080x1920 with no scrolling. Playwright's
 * viewport is set to the same size so the screenshot is pixel-perfect.
 */

import { Suspense } from "react";
import RenderFrame from "./RenderFrame";

export default function RenderPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: 1080,
            height: 1920,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontFamily: "system-ui",
          }}
        >
          Loading frame…
        </div>
      }
    >
      <RenderFrame />
    </Suspense>
  );
}
