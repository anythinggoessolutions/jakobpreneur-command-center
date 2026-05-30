"use client";

/**
 * RenderFrame — the actual frame renderer. Separated into its own
 * component so useSearchParams() can sit inside a <Suspense> boundary
 * (Next.js 16 requirement for client components using useSearchParams).
 *
 * Safe zones for TikTok / Instagram Reels / YouTube Shorts:
 *   Top:    250px clear (YouTube Shorts has the tallest top bar)
 *   Bottom: 400px clear (TikTok/YT Shorts have tall bottom overlays)
 *   Sides:  80px each   (YT Shorts action buttons on the right)
 *   → Content area: x=80..1000, y=250..1520 (920×1270)
 *
 * All important content (branding, messages, hook text, reply cards)
 * must fit within this safe area so nothing gets clipped by platform
 * UI overlays across all three platforms.
 */

import { useSearchParams } from "next/navigation";
import GodTextPhoneMockup, {
  type PhonePlatform,
  type ChatMessage,
} from "@/components/GodTextPhoneMockup";
import GodTextCookingWhite from "@/components/GodTextCookingWhite";
import GodTextCookingDark from "@/components/GodTextCookingDark";

// Keep PHONE_SCALE for cooking frames (they're centered and OK)
const PHONE_SCALE = 2.25;
const FRAME_W = 1080;
const FRAME_H = 1920;

// Safe zone boundaries
const SAFE_TOP = 250;
const SAFE_BOTTOM = 1520;
const SAFE_LEFT = 80;
const SAFE_RIGHT = 1000;

// Platform bubble styles — same as GodTextPhoneMockup but used inline
const PLATFORM_STYLES: Record<
  string,
  {
    appBg: string;
    headerText: string;
    manBubble: string;
    manText: string;
    womanBubble: string;
    womanText: string;
    accent: string;
    fontFamily: string;
    isDark: boolean;
  }
> = {
  Hinge: {
    appBg: "#1A1A2E",
    headerText: "#FFFFFF",
    manBubble: "#4F2B7A",
    manText: "#FFFFFF",
    womanBubble: "rgba(255,255,255,0.12)",
    womanText: "#FFFFFF",
    accent: "#4F2B7A",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
    isDark: true,
  },
  Instagram: {
    appBg: "#000000",
    headerText: "#FFFFFF",
    manBubble: "linear-gradient(135deg,#9b3cd6 0%,#ed4956 50%,#f6a23c 100%)",
    manText: "#FFFFFF",
    womanBubble: "#262626",
    womanText: "#FFFFFF",
    accent: "#ED4956",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
    isDark: true,
  },
  Tinder: {
    appBg: "#1A1A2E",
    headerText: "#FFFFFF",
    manBubble: "linear-gradient(135deg,#FE3C72 0%,#FF655B 100%)",
    manText: "#FFFFFF",
    womanBubble: "rgba(255,255,255,0.12)",
    womanText: "#FFFFFF",
    accent: "#FE3C72",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
    isDark: true,
  },
  iMessage: {
    appBg: "#000000",
    headerText: "#FFFFFF",
    manBubble: "#0B84FE",
    manText: "#FFFFFF",
    womanBubble: "#26252A",
    womanText: "#FFFFFF",
    accent: "#0B84FE",
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    isDark: true,
  },
};

export default function RenderFrame() {
  const params = useSearchParams();
  const type = params.get("type") || "phone";

  if (type === "hook") {
    return <HookFrame hookText={params.get("hook") || ""} />;
  }

  if (type === "hook-overlay") {
    return <HookOverlay hookText={params.get("hook") || ""} />;
  }

  if (type === "baddie-overlay") {
    return <BaddieOverlay introText={params.get("intro") || ""} />;
  }

  if (type === "thirst-trap") {
    const headline = params.get("headline") || "";
    const subtext = params.get("subtext") || "";
    const slideType = (params.get("slideType") || "tip") as
      | "hook"
      | "tip"
      | "twist"
      | "cta";
    return (
      <ThirstTrapSlide
        headline={headline}
        subtext={subtext}
        slideType={slideType}
      />
    );
  }

  if (type === "reply") {
    const replyText = params.get("reply") || "";
    const theme = params.get("theme") || "dark";
    return <ReplyFrame replyText={replyText} theme={theme} />;
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

  // Default: phone conversation frame — rendered with safe zones
  const platform = (params.get("platform") || "iMessage") as PhonePlatform;
  const womanName = params.get("womanName") || "Maya";
  let messages: ChatMessage[] = [];
  try {
    messages = JSON.parse(params.get("messages") || "[]");
  } catch {
    // ignore parse errors
  }

  return (
    <SafeConversationFrame
      platform={platform}
      womanName={womanName}
      messages={messages}
    />
  );
}

// ---------------------------------------------------------------------------
// Safe-zone-aware conversation frame (replaces phone shell for video)
// ---------------------------------------------------------------------------

function SafeConversationFrame({
  platform,
  messages,
}: {
  platform: PhonePlatform;
  womanName: string;
  messages: ChatMessage[];
}) {
  const s = PLATFORM_STYLES[platform] || PLATFORM_STYLES.iMessage;

  // Clean centered layout — just the latest 1-2 messages as big bubbles
  // in the center of the safe zone. No header, no avatar, no branding.
  // Matches the competitor style: easy to read, back-and-forth flow.
  const fontSize = 42;
  const padV = 24;
  const padH = 36;
  const gap = 28;

  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: s.appBg,
        position: "relative",
        overflow: "hidden",
        fontFamily: s.fontFamily,
      }}
    >
      {/* Messages — centered in safe zone, big and readable */}
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          bottom: FRAME_H - SAFE_BOTTOM,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          display: "flex",
          flexDirection: "column",
          gap,
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {messages.map((m, i) => {
          const isMan = m.sender === "man";
          const bubble = isMan ? s.manBubble : s.womanBubble;
          const txt = isMan ? s.manText : s.womanText;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isMan ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: `${padV}px ${padH}px`,
                  borderRadius: 32,
                  background: bubble,
                  color: txt,
                  fontSize,
                  fontWeight: 500,
                  lineHeight: 1.35,
                  borderBottomRightRadius: isMan ? 10 : 32,
                  borderBottomLeftRadius: isMan ? 32 : 10,
                }}
              >
                {renderBlurred(m.text)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook frame — safe-zone-aware
// ---------------------------------------------------------------------------

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@500;600;700&display=swap');
      `}</style>

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,68,0,0.12) 0%, transparent 70%)",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Content — constrained to safe zone */}
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          bottom: FRAME_H - SAFE_BOTTOM,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          zIndex: 1,
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

        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 52,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            textAlign: "center",
            lineHeight: 1.25,
            maxWidth: SAFE_RIGHT - SAFE_LEFT - 40,
            margin: 0,
          }}
        >
          {hookText}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reply frame — safe-zone-aware
// ---------------------------------------------------------------------------

function ReplyFrame({ replyText, theme }: { replyText: string; theme: string }) {
  const isDark = theme === "dark";
  const bg = isDark ? "#0C0C0E" : "#F5F1EB";
  const accent = isDark ? "#FF4400" : "#E03E00";
  const textColor = isDark ? "#fff" : "#1A1208";
  const mutedColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(26,18,8,0.4)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,18,8,0.03)";
  const cardBorder = isDark
    ? "1.5px solid rgba(255,68,0,0.2)"
    : "1.5px solid rgba(224,62,0,0.15)";
  const fontClass = isDark ? "syne" : "playfair";
  const bodyClass = isDark ? "dm" : "jakarta";

  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: bg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .syne { font-family: 'Syne', sans-serif; }
        .dm { font-family: 'DM Sans', sans-serif; }
        .playfair { font-family: 'Playfair Display', Georgia, serif; }
        .jakarta { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
      `}</style>

      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Content — constrained to safe zone */}
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          bottom: FRAME_H - SAFE_BOTTOM,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          zIndex: 1,
        }}
      >
        {/* GodText AI wordmark */}
        <div
          className={fontClass}
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: textColor,
            letterSpacing: "-0.02em",
          }}
        >
          GodText{" "}
          <span style={{ color: accent }}>AI</span>
        </div>

        {/* Label */}
        <div
          className={bodyClass}
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: mutedColor,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Send this
        </div>

        {/* Reply card */}
        <div
          style={{
            width: "100%",
            maxWidth: 800,
            borderRadius: 28,
            padding: "44px 48px",
            background: cardBg,
            border: cardBorder,
          }}
        >
          <p
            className={bodyClass}
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: textColor,
              lineHeight: 1.35,
              margin: 0,
              textAlign: "center",
            }}
          >
            {replyText}
          </p>
        </div>

        {/* Send button */}
        <div
          style={{
            padding: "18px 56px",
            borderRadius: 20,
            background: accent,
            color: "#fff",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
          className={bodyClass}
        >
          Send it
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook overlay — transparent background, branded text only
// Used as a PNG overlay on top of hook background videos
// ---------------------------------------------------------------------------

function HookOverlay({ hookText }: { hookText: string }) {
  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: "#00FF00",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@500;600;700&display=swap');
      `}</style>

      {/* Content — near top of safe zone so it doesn't cover the face */}
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP + 20,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 80,
            fontWeight: 800,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: SAFE_RIGHT - SAFE_LEFT - 20,
            margin: 0,
            WebkitTextStroke: "3px #000000",
            paintOrder: "stroke fill",
            textShadow: "0 3px 24px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.95)",
          }}
        >
          {hookText.split("\n").map((line, i) => (
            <p
              key={i}
              style={{
                margin: 0,
                marginTop: i > 0 ? 8 : 0,
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Baddie overlay — transparent background, intro text only
// Used as a PNG overlay on top of baddie photo frames
// ---------------------------------------------------------------------------

function BaddieOverlay({ introText }: { introText: string }) {
  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: "#00FF00",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&display=swap');
      `}</style>

      {/* Intro text at the top of safe zone */}
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP + 20,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 44,
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.3,
            margin: 0,
            textShadow: "0 2px 16px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)",
          }}
        >
          {introText}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thirst Trap slide — text overlay on green screen (baddie composited later)
// ---------------------------------------------------------------------------

function ThirstTrapSlide({
  headline,
  subtext,
  slideType,
}: {
  headline: string;
  subtext: string;
  slideType: "hook" | "tip" | "twist" | "cta";
}) {
  const isCta = slideType === "cta";

  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: "#00FF00",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
      `}</style>

      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          bottom: FRAME_H - SAFE_BOTTOM,
          left: SAFE_LEFT + 20,
          right: FRAME_W - SAFE_RIGHT + 20,
          display: "flex",
          flexDirection: "column",
          alignItems: isCta ? "center" : "flex-start",
          justifyContent: "center",
          gap: isCta ? 48 : 24,
          zIndex: 1,
        }}
      >
        {/* GodText AI branding on CTA slide */}
        {isCta && (
          <div
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 56,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
              textShadow:
                "0 2px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)",
            }}
          >
            GodText <span style={{ color: "#FF4400" }}>AI</span>
          </div>
        )}

        {/* Headline */}
        <p
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: isCta ? 44 : 56,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.15,
            margin: 0,
            textAlign: isCta ? "center" : "left",
            textShadow:
              "0 3px 20px rgba(0,0,0,0.85), 0 1px 6px rgba(0,0,0,0.9)",
            maxWidth: SAFE_RIGHT - SAFE_LEFT - 40,
          }}
        >
          {headline}
        </p>

        {/* Subtext */}
        {subtext && (
          <p
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: isCta ? 32 : 36,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.35,
              margin: 0,
              textAlign: isCta ? "center" : "left",
              textShadow:
                "0 2px 12px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)",
              maxWidth: SAFE_RIGHT - SAFE_LEFT - 40,
            }}
          >
            {subtext}
          </p>
        )}

        {/* CTA button */}
        {isCta && (
          <div
            style={{
              padding: "20px 48px",
              borderRadius: 20,
              background: "#FF4400",
              color: "#fff",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              textShadow: "none",
              letterSpacing: "0.02em",
            }}
          >
            Download free — link in bio
          </div>
        )}

        {/* Slide number indicator (non-CTA) */}
        {!isCta && slideType !== "hook" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              textShadow:
                "0 1px 8px rgba(0,0,0,0.8)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {slideType === "twist" ? "But here's the thing..." : "Swipe →"}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phone number blur helper
// ---------------------------------------------------------------------------

function renderBlurred(text: string) {
  const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  const parts = text.split(phoneRegex);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        phoneRegex.test(part) ? (
          <span
            key={i}
            style={{ filter: "blur(12px)", userSelect: "none", display: "inline" }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
