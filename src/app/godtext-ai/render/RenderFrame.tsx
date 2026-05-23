"use client";

/**
 * RenderFrame — the actual frame renderer. Separated into its own
 * component so useSearchParams() can sit inside a <Suspense> boundary
 * (Next.js 16 requirement for client components using useSearchParams).
 */

import { useSearchParams } from "next/navigation";
import GodTextPhoneMockup, {
  type PhonePlatform,
  type ChatMessage,
} from "@/components/GodTextPhoneMockup";
import GodTextCookingWhite from "@/components/GodTextCookingWhite";
import GodTextCookingDark from "@/components/GodTextCookingDark";

/** The phone mockup renders at 390x844. To fill 1080w we scale ~2.77x.
 *  The video frame is 1080x1920. The phone shell (844 * 2.77 = 2337)
 *  is taller than 1920, so we need to fit it. We use 2.25x which gives
 *  877×1899 — fits with ~10px margin on each side vertically. */
const PHONE_SCALE = 2.25;
const FRAME_W = 1080;
const FRAME_H = 1920;

export default function RenderFrame() {
  const params = useSearchParams();
  const type = params.get("type") || "phone";

  if (type === "hook") {
    return <HookFrame hookText={params.get("hook") || ""} />;
  }

  if (type === "cooking") {
    const theme = params.get("theme") || "dark";
    const phase = (params.get("phase") || "cooking") as "cooking" | "reveal";
    const step = params.get("step") ? Number(params.get("step")) : undefined;

    const CookingComponent =
      theme === "white" ? GodTextCookingWhite : GodTextCookingDark;

    return (
      <div
        style={{
          width: FRAME_W,
          height: FRAME_H,
          background: theme === "white" ? "#F5F1EB" : "#0C0C0E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Subtle radial glow behind the phone */}
        <div
          style={{
            position: "absolute",
            width: FRAME_W * 0.8,
            height: FRAME_W * 0.8,
            borderRadius: "50%",
            background:
              theme === "white"
                ? "radial-gradient(circle, rgba(224,62,0,0.06) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(255,68,0,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            borderRadius: 32 * PHONE_SCALE,
            overflow: "hidden",
            boxShadow:
              theme === "white"
                ? "0 20px 80px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)"
                : "0 20px 80px rgba(0,0,0,0.5), 0 0 40px rgba(255,68,0,0.05)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <CookingComponent
            phase={phase}
            frozenStep={step}
            scale={PHONE_SCALE}
          />
        </div>
      </div>
    );
  }

  // Default: phone conversation frame
  const platform = (params.get("platform") || "iMessage") as PhonePlatform;
  let messages: ChatMessage[] = [];
  try {
    messages = JSON.parse(params.get("messages") || "[]");
  } catch {
    // ignore parse errors — render empty conversation
  }

  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background:
          platform === "iMessage" || platform === "Instagram"
            ? "#000000"
            : "#F0EDE8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          borderRadius: 32 * PHONE_SCALE,
          overflow: "hidden",
          boxShadow: "0 20px 80px rgba(0,0,0,0.25), 0 4px 20px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <GodTextPhoneMockup
          platform={platform}
          messages={messages}
          scale={PHONE_SCALE}
        />
      </div>
    </div>
  );
}

function HookFrame({ hookText }: { hookText: string }) {
  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: "linear-gradient(180deg, #0C0C0E 0%, #1A1A2E 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,68,0,0.12) 0%, transparent 70%)",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* GodText AI wordmark */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 52,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          GodText{" "}
          <span style={{ color: "#FF4400" }}>AI</span>
        </div>

        {/* Hook text */}
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 56,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            textAlign: "center",
            lineHeight: 1.25,
            maxWidth: 900,
            margin: 0,
          }}
        >
          {hookText}
        </p>
      </div>

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@500;600;700&display=swap');
      `}</style>
    </div>
  );
}
