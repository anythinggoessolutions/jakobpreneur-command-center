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
    <>
      {/* Cover the root layout's Navbar/Footer — this page is only
          visited by Playwright for screenshotting video frames. */}
      <style>{`
        nav, footer, header { display: none !important; }
        main { padding: 0 !important; margin: 0 !important; flex: unset !important; }
        body { min-height: unset !important; display: block !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: #000 !important; }
      `}</style>
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
    </>
  );
}
