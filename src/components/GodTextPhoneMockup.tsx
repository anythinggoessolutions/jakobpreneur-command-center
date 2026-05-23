"use client";

/**
 * GodText AI — Component A: Phone Conversation Mockup
 *
 * Renders a text-message conversation in the visual style of Hinge,
 * Instagram DMs, Tinder, or iMessage (dark mode). Designed to be
 * screenshotted by a headless browser at 1080x1920 for the FFmpeg
 * assembly step. Each call accepts a slice of the messages array so
 * the video can "build" the conversation message by message.
 *
 * Brand boundary: this component is GodText AI only. No JakobPreneur
 * styling, no shared green accents — only the conversation itself.
 *
 * First-pass styling deliberately uses approximations of each app's
 * look. Once the UI Reference vault has real screenshots Jakob can
 * point at, we'll tune bubble colors / fonts / header bars to match
 * exactly.
 */

export type ChatMessage = {
  sender: "man" | "woman";
  text: string;
};

export type PhonePlatform = "Hinge" | "Instagram" | "Tinder" | "iMessage";

interface PhoneMockupProps {
  platform: PhonePlatform;
  messages: ChatMessage[];
  womanName?: string;
  /** Optional public URL for the woman's avatar. */
  womanAvatarUrl?: string;
  /** Scales the mockup. 1 = native (~390x844 phone shell). */
  scale?: number;
}

const PLATFORM_STYLES: Record<
  PhonePlatform,
  {
    appBg: string;
    headerBg: string;
    headerText: string;
    manBubble: string;
    manText: string;
    womanBubble: string;
    womanText: string;
    accent: string;
    fontFamily: string;
  }
> = {
  Hinge: {
    appBg: "#FFFFFF",
    headerBg: "#FFFFFF",
    headerText: "#1A1A1A",
    manBubble: "#4F2B7A",
    manText: "#FFFFFF",
    womanBubble: "#F1F1F3",
    womanText: "#1A1A1A",
    accent: "#4F2B7A",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
  },
  Instagram: {
    appBg: "#000000",
    headerBg: "#000000",
    headerText: "#FFFFFF",
    manBubble: "linear-gradient(135deg,#9b3cd6 0%,#ed4956 50%,#f6a23c 100%)",
    manText: "#FFFFFF",
    womanBubble: "#262626",
    womanText: "#FFFFFF",
    accent: "#ED4956",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
  },
  Tinder: {
    appBg: "#FFFFFF",
    headerBg: "#FFFFFF",
    headerText: "#424242",
    manBubble: "linear-gradient(135deg,#FE3C72 0%,#FF655B 100%)",
    manText: "#FFFFFF",
    womanBubble: "#F0F0F0",
    womanText: "#1A1A1A",
    accent: "#FE3C72",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
  },
  iMessage: {
    appBg: "#000000",
    headerBg: "#1C1C1E",
    headerText: "#FFFFFF",
    manBubble: "#0B84FE",
    manText: "#FFFFFF",
    womanBubble: "#26252A",
    womanText: "#FFFFFF",
    accent: "#0B84FE",
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
  },
};

export default function GodTextPhoneMockup({
  platform,
  messages,
  womanName = "Maya",
  womanAvatarUrl,
  scale = 1,
}: PhoneMockupProps) {
  const s = PLATFORM_STYLES[platform];

  // Base phone shell dimensions. The 9:16 frame for the video pipeline is
  // 1080x1920; this component renders at design size and is screenshotted
  // at that resolution by the headless renderer (Phase B).
  const W = 390;
  const H = 844;

  return (
    <div
      style={{
        width: W * scale,
        height: H * scale,
        background: s.appBg,
        fontFamily: s.fontFamily,
        color: s.womanText,
        borderRadius: 32 * scale,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          height: 44 * scale,
          background: s.headerBg,
          color: s.headerText,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${22 * scale}px`,
          fontSize: 14 * scale,
          fontWeight: 600,
          paddingTop: 8 * scale,
        }}
      >
        <span>9:41</span>
        <span style={{ fontSize: 11 * scale, opacity: 0.7 }}>
          ●●●●● 5G
        </span>
      </div>

      {/* App header */}
      <div
        style={{
          height: 56 * scale,
          background: s.headerBg,
          color: s.headerText,
          display: "flex",
          alignItems: "center",
          gap: 10 * scale,
          padding: `0 ${14 * scale}px`,
          borderBottom: `1px solid ${platform === "iMessage" || platform === "Instagram" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <span style={{ fontSize: 22 * scale, opacity: 0.7 }}>‹</span>
        <div
          style={{
            width: 32 * scale,
            height: 32 * scale,
            borderRadius: "50%",
            background: womanAvatarUrl ? "transparent" : "linear-gradient(135deg,#ff8aae,#ffd2ad)",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#fff",
            fontSize: 13 * scale,
          }}
        >
          {womanAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={womanAvatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            womanName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div style={{ flex: 1, fontSize: 15 * scale, fontWeight: 600 }}>
          {womanName}
        </div>
        <span style={{ opacity: 0.5, fontSize: 17 * scale }}>⋯</span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: `${12 * scale}px ${14 * scale}px`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 6 * scale,
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
                  maxWidth: "75%",
                  padding: `${9 * scale}px ${13 * scale}px`,
                  borderRadius: 18 * scale,
                  background: bubble,
                  color: txt,
                  fontSize: 15 * scale,
                  lineHeight: 1.25,
                  // iMessage gives the trailing-tail look on the last
                  // bubble in a sender streak; we approximate with the
                  // corner radii.
                  borderBottomRightRadius: isMan ? 5 * scale : 18 * scale,
                  borderBottomLeftRadius: isMan ? 18 * scale : 5 * scale,
                }}
              >
                {renderWithBlurredNumbers(m.text, scale)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input bar (decorative) */}
      <div
        style={{
          height: 56 * scale,
          padding: `0 ${14 * scale}px`,
          background: s.headerBg,
          borderTop: `1px solid ${platform === "iMessage" || platform === "Instagram" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 36 * scale,
            background: platform === "iMessage" || platform === "Instagram" ? "#1C1C1E" : "#F1F1F3",
            borderRadius: 18 * scale,
          }}
        />
        <div
          style={{
            width: 32 * scale,
            height: 32 * scale,
            borderRadius: "50%",
            background: s.accent,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Detects phone numbers in message text and renders them with a blur
 * effect — looks like the creator is protecting the girl's privacy,
 * which is standard for viral rizz TikToks.
 */
function renderWithBlurredNumbers(text: string, scale: number) {
  // Match common US phone number formats:
  //   555-867-5309, (555) 234-5678, 555 234 5678, 5558675309
  const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  const parts = text.split(phoneRegex);

  if (parts.length === 1) return text; // no phone numbers found

  return (
    <>
      {parts.map((part, i) =>
        phoneRegex.test(part) ? (
          <span
            key={i}
            style={{
              filter: `blur(${6 * scale}px)`,
              userSelect: "none",
              display: "inline",
            }}
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
