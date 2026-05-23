"use client";

/**
 * GodText AI — Component B: Generating Screen (product demo beat)
 *
 * This is the screen the video cuts to between beats — the "Cooking up
 * rizz…" moment that sells the app. Dark mode placeholder UI: woman's
 * incoming message at top, animated loading indicator, then the AI
 * response revealed below.
 *
 * Brand boundary: pure GodText AI. Logo / wordmark / accent colors get
 * swapped in once Jakob ships the real brand assets — the placeholders
 * below are commented so the swap is obvious.
 */

interface GeneratingScreenProps {
  womanMessage: string;
  aiResponse: string;
  state: "loading" | "revealed";
  /** Optional override — used by the static frame renderer. */
  scale?: number;
}

export default function GodTextGeneratingScreen({
  womanMessage,
  aiResponse,
  state,
  scale = 1,
}: GeneratingScreenProps) {
  const W = 390;
  const H = 844;

  // TODO(brand): replace these placeholders once Jakob ships the real
  // GodText AI brand kit (logo SVG, exact hex codes, font).
  const BG = "#08070C";
  const PANEL = "#15131E";
  const ACCENT = "#A076FF"; // placeholder lilac — swap for real brand accent
  const TEXT = "#FFFFFF";
  const MUTED = "#8B8694";

  return (
    <div
      style={{
        width: W * scale,
        height: H * scale,
        background: BG,
        color: TEXT,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        borderRadius: 32 * scale,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          height: 44 * scale,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${8 * scale}px ${22 * scale}px 0`,
          fontSize: 14 * scale,
          fontWeight: 600,
        }}
      >
        <span>9:41</span>
        <span style={{ fontSize: 11 * scale, opacity: 0.6 }}>●●●●● 5G</span>
      </div>

      {/* Brand mark (placeholder wordmark — swap for real logo) */}
      <div
        style={{
          padding: `${18 * scale}px ${20 * scale}px ${10 * scale}px`,
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
        }}
      >
        <div
          style={{
            width: 28 * scale,
            height: 28 * scale,
            borderRadius: 8 * scale,
            background: `linear-gradient(135deg, ${ACCENT}, #5C2EBA)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16 * scale,
          }}
        >
          G
        </div>
        <div style={{ fontSize: 18 * scale, fontWeight: 700, letterSpacing: -0.4 }}>
          GodText AI
        </div>
      </div>

      {/* Her message card */}
      <div style={{ padding: `${10 * scale}px ${20 * scale}px` }}>
        <div
          style={{
            fontSize: 11 * scale,
            color: MUTED,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            marginBottom: 8 * scale,
            fontWeight: 600,
          }}
        >
          Her last message
        </div>
        <div
          style={{
            background: PANEL,
            borderRadius: 16 * scale,
            padding: `${14 * scale}px ${16 * scale}px`,
            fontSize: 15 * scale,
            lineHeight: 1.4,
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          {womanMessage}
        </div>
      </div>

      {/* Loading / revealed section */}
      <div
        style={{
          flex: 1,
          padding: `${20 * scale}px`,
          display: "flex",
          flexDirection: "column",
          gap: 16 * scale,
        }}
      >
        <div
          style={{
            fontSize: 11 * scale,
            color: MUTED,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            fontWeight: 600,
          }}
        >
          {state === "loading" ? "Cooking up rizz…" : "Your suggested reply"}
        </div>

        {state === "loading" ? (
          <div
            style={{
              flex: 1,
              borderRadius: 18 * scale,
              background: PANEL,
              border: `1px solid rgba(255,255,255,0.04)`,
              padding: 20 * scale,
              display: "flex",
              flexDirection: "column",
              gap: 14 * scale,
              justifyContent: "center",
            }}
          >
            {/* Shimmer bars approximating an AI thinking state */}
            {[0.9, 0.75, 0.6].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 12 * scale,
                  width: `${w * 100}%`,
                  borderRadius: 6 * scale,
                  background: `linear-gradient(90deg, rgba(255,255,255,0.05), ${ACCENT}66, rgba(255,255,255,0.05))`,
                  backgroundSize: "200% 100%",
                  animation: "godtextShimmer 1.4s linear infinite",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
            <div
              style={{
                marginTop: 12 * scale,
                display: "flex",
                alignItems: "center",
                gap: 6 * scale,
                fontSize: 13 * scale,
                color: MUTED,
              }}
            >
              <span
                style={{
                  width: 8 * scale,
                  height: 8 * scale,
                  borderRadius: "50%",
                  background: ACCENT,
                  animation: "godtextPulse 1s ease-in-out infinite",
                }}
              />
              Thinking…
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              borderRadius: 18 * scale,
              background: `linear-gradient(180deg, ${PANEL} 0%, ${BG} 100%)`,
              border: `1px solid ${ACCENT}55`,
              padding: 20 * scale,
              fontSize: 17 * scale,
              lineHeight: 1.45,
              fontWeight: 500,
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            {aiResponse}
          </div>
        )}

        {/* CTA button (decorative — represents the "Send" action) */}
        <div
          style={{
            height: 52 * scale,
            borderRadius: 14 * scale,
            background: state === "revealed" ? ACCENT : `${ACCENT}33`,
            color: state === "revealed" ? "#0E0917" : MUTED,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15 * scale,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          {state === "revealed" ? "Send it" : "Generating…"}
        </div>
      </div>

      {/* Keyframes — scoped via a style tag so the animations work
          inside the headless screenshot pass without external CSS. */}
      <style>{`
        @keyframes godtextShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes godtextPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
