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
  womanName,
  messages,
}: {
  platform: PhonePlatform;
  womanName: string;
  messages: ChatMessage[];
}) {
  const s = PLATFORM_STYLES[platform] || PLATFORM_STYLES.iMessage;

  // Layout constants within the safe zone
  const BRAND_Y = SAFE_TOP + 20;       // GodText AI branding
  const BRAND_H = 45;
  const HEADER_Y = BRAND_Y + BRAND_H + 16; // Woman name header
  const HEADER_H = 50;
  const MSG_TOP = HEADER_Y + HEADER_H + 20; // Messages start
  const MSG_BOTTOM = SAFE_BOTTOM - 20;       // Messages end
  const MSG_AREA_H = MSG_BOTTOM - MSG_TOP;   // ~1099px

  // Auto-scale font if too many messages
  // Base: 34px font, ~85px per message (padding + line + gap)
  const baseFont = 34;
  const baseGap = 14;
  const basePadV = 18;
  const basePadH = 26;
  const estPerMsg = baseFont * 1.3 + basePadV * 2 + baseGap;
  const totalEst = messages.length * estPerMsg;
  const scaleFactor = totalEst > MSG_AREA_H ? MSG_AREA_H / totalEst : 1;
  const fontSize = Math.max(22, Math.round(baseFont * scaleFactor));
  const gap = Math.max(8, Math.round(baseGap * scaleFactor));
  const padV = Math.max(12, Math.round(basePadV * scaleFactor));
  const padH = Math.max(18, Math.round(basePadH * scaleFactor));

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Subtle background glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${s.accent}15 0%, transparent 70%)`,
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* GodText AI branding — inside safe zone */}
      <div
        style={{
          position: "absolute",
          top: BRAND_Y,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          height: BRAND_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 32,
            fontWeight: 800,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "-0.02em",
          }}
        >
          GodText{" "}
          <span style={{ color: `${s.accent}80` }}>AI</span>
        </div>
      </div>

      {/* Chat header — woman name + avatar */}
      <div
        style={{
          position: "absolute",
          top: HEADER_Y,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingLeft: 10,
          zIndex: 2,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#ff8aae,#ffd2ad)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
            fontSize: 18,
            fontFamily: s.fontFamily,
            flexShrink: 0,
          }}
        >
          {womanName.slice(0, 1).toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: s.headerText,
          }}
        >
          {womanName}
        </div>
      </div>

      {/* Separator line */}
      <div
        style={{
          position: "absolute",
          top: HEADER_Y + HEADER_H + 4,
          left: SAFE_LEFT,
          right: FRAME_W - SAFE_RIGHT,
          height: 1,
          background: "rgba(255,255,255,0.08)",
          zIndex: 2,
        }}
      />

      {/* Messages — all within safe zone */}
      <div
        style={{
          position: "absolute",
          top: MSG_TOP,
          left: SAFE_LEFT,
          width: SAFE_RIGHT - SAFE_LEFT,
          height: MSG_AREA_H,
          display: "flex",
          flexDirection: "column",
          gap,
          overflow: "hidden",
          zIndex: 2,
          justifyContent: "flex-end",
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
                  maxWidth: "72%",
                  padding: `${padV}px ${padH}px`,
                  borderRadius: 28,
                  background: bubble,
                  color: txt,
                  fontSize,
                  lineHeight: 1.3,
                  borderBottomRightRadius: isMan ? 8 : 28,
                  borderBottomLeftRadius: isMan ? 28 : 8,
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
