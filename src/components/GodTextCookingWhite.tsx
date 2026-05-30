"use client";

/**
 * GodText AI — Cooking / Reveal Screen (White Theme)
 *
 * 9:16 SAFE ZONE LAYOUT (390x844 native, scaled by `scale` prop)
 * ─────────────────────────────
 * Top dead zone:    0–150px   (platform username, follow button, etc.)
 * Safe zone:        150–674px (524px of usable space)
 * Bottom dead zone: 674–844px (captions, like/comment/share buttons)
 * ─────────────────────────────
 * Strategy: Push the GodText header into the top dead zone (it brands
 * the frame but is fine if partially covered). All meaningful content
 * starts at ~150px and ends by ~670px.
 *
 * Fonts: Playfair Display + Plus Jakarta Sans. Background: #F5F1EB.
 * Accent: #E03E00.
 */

import { useState, useEffect } from "react";

interface CookingWhiteProps {
  phase?: "cooking" | "reveal";
  /** Which loading step to freeze on (0-2). Only used in "cooking" phase
   *  when the pipeline captures a specific step as a static frame. When
   *  omitted the component cycles through steps automatically. */
  frozenStep?: number;
  scale?: number;
}

const LOADING_MESSAGES = [
  { icon: "spinner" as const, text: "Analyzing conversation…" },
  { icon: "brain" as const, text: "Understanding context…" },
  { icon: "sparkle" as const, text: "Crafting replies…" },
];

export default function GodTextCookingWhite({
  phase = "cooking",
  frozenStep,
  scale = 1,
}: CookingWhiteProps) {
  const [loadingStep, setLoadingStep] = useState(frozenStep ?? 0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (phase === "cooking") {
      setShowResults(false);
      if (typeof frozenStep === "number") {
        setLoadingStep(frozenStep);
        return;
      }
      setLoadingStep(0);
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      const t = setTimeout(() => setShowResults(true), 200);
      return () => clearTimeout(t);
    }
  }, [phase, frozenStep]);

  const currentLoading = LOADING_MESSAGES[loadingStep];

  const W = 390 * scale;
  const H = 844 * scale;
  const s = scale; // shorthand

  return (
    <div
      style={{
        width: W,
        height: H,
        fontFamily:
          "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#F5F1EB",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .playfair { font-family: 'Playfair Display', Georgia, serif; }
        .jakarta { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }

        @keyframes gt-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gt-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gt-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gt-staggerIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══ TOP DEAD ZONE (0–150px) ═══
          Header lives here. Fine if platform UI partially covers it —
          it still brands the frame. */}
      <div
        style={{
          minHeight: 150 * s,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: `0 ${20 * s}px ${8 * s}px`,
        }}
      >
        <h1
          className="playfair"
          style={{
            fontSize: 22 * s,
            fontWeight: 700,
            color: "#1A1208",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          GodText AI
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20 * s,
            marginTop: 4 * s,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <span
              className="jakarta"
              style={{ fontSize: 13 * s, fontWeight: 700, color: "#1A1208" }}
            >
              Analyze
            </span>
            <div
              style={{
                width: "100%",
                height: 2.5 * s,
                background: "#E03E00",
                borderRadius: 99,
                marginTop: 2 * s,
              }}
            />
          </div>
          <span
            className="jakarta"
            style={{
              fontSize: 13 * s,
              fontWeight: 500,
              color: "rgba(26,18,8,0.35)",
            }}
          >
            Rizz Vault
          </span>
          <span
            className="jakarta"
            style={{
              fontSize: 13 * s,
              fontWeight: 500,
              color: "rgba(26,18,8,0.35)",
            }}
          >
            Profile
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(26,18,8,0.06)" }} />

      {/* ═══ SAFE ZONE (~524px) ═══
          All key content lives here */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          maxHeight: 524 * s,
        }}
      >
        {/* Background (blurred when cooking) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: `${16 * s}px ${20 * s}px`,
            overflowY: "auto",
            filter: phase === "cooking" ? "blur(8px)" : "none",
            opacity: phase === "cooking" ? 0.5 : 1,
            transition: "filter 0.4s ease, opacity 0.4s ease",
          }}
        >
          {phase === "cooking" ? (
            <CookingBackground scale={s} />
          ) : (
            <RevealContent scale={s} showResults={showResults} />
          )}
        </div>

        {/* Loading Modal (cooking only) */}
        {phase === "cooking" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: "#F5F1EB",
                borderRadius: 16 * s,
                padding: `${32 * s}px ${40 * s}px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16 * s,
                margin: `0 ${32 * s}px`,
                border: "1px solid rgba(26,18,8,0.08)",
                boxShadow:
                  "0 8px 40px rgba(26,18,8,0.12), 0 2px 8px rgba(26,18,8,0.06)",
                animation: "gt-fadeIn 0.3s ease forwards",
              }}
            >
              <div
                style={{
                  width: 56 * s,
                  height: 56 * s,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(224,62,0,0.08)",
                }}
              >
                <LoadingIcon icon={currentLoading.icon} scale={s} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p
                  className="jakarta"
                  key={loadingStep}
                  style={{
                    fontSize: 18 * s,
                    fontWeight: 700,
                    color: "#1A1208",
                    margin: 0,
                    animation: "gt-fadeUp 0.3s ease forwards",
                  }}
                >
                  {currentLoading.text}
                </p>
                <p
                  className="jakarta"
                  style={{
                    fontSize: 14 * s,
                    color: "rgba(26,18,8,0.4)",
                    marginTop: 4 * s,
                    marginBottom: 0,
                  }}
                >
                  This usually takes 15–30 seconds
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM DEAD ZONE (170px) ═══
          Tab bar lives here. Fine if platform captions/buttons cover it. */}
      <div
        style={{
          minHeight: 170 * s,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 1, background: "rgba(26,18,8,0.06)" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            paddingTop: 12 * s,
          }}
        >
          <TabBarItem label="Analyze" active scale={s} />
          <TabBarItem label="Vault" scale={s} />
          <TabBarItem label="Profile" scale={s} />
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function LoadingIcon({
  icon,
  scale,
}: {
  icon: "spinner" | "brain" | "sparkle";
  scale: number;
}) {
  if (icon === "spinner") {
    return (
      <svg
        width={28 * scale}
        height={28 * scale}
        viewBox="0 0 28 28"
        fill="none"
        style={{ animation: "gt-spin 1s linear infinite" }}
      >
        <circle
          cx="14"
          cy="14"
          r="11"
          stroke="rgba(224,62,0,0.15)"
          strokeWidth="3"
        />
        <path
          d="M14 3a11 11 0 019.5 5.5"
          stroke="#E03E00"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (icon === "brain") {
    return (
      <svg
        width={26 * scale}
        height={26 * scale}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2C9 2 7 4 7 6.5C5.5 7 4 8.5 4 10.5C4 12 5 13.5 6 14C6 16 7.5 18 10 18.5V22H14V18.5C16.5 18 18 16 18 14C19 13.5 20 12 20 10.5C20 8.5 18.5 7 17 6.5C17 4 15 2 12 2Z"
          stroke="#E03E00"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 2V18.5"
          stroke="#E03E00"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 10.5H17"
          stroke="#E03E00"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8.5 14H15.5"
          stroke="#E03E00"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={24 * scale}
      height={24 * scale}
      viewBox="0 0 24 24"
      fill="#E03E00"
    >
      <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6Z" />
    </svg>
  );
}

function CookingBackground({ scale }: { scale: number }) {
  const s = scale;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12 * s }}
    >
      <div>
        <h2
          className="playfair"
          style={{
            fontSize: 24 * s,
            fontWeight: 700,
            color: "#1A1208",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Choose How To
          <br />
          Analyze Your Convo.
        </h2>
        <p
          className="jakarta"
          style={{
            fontSize: 13 * s,
            color: "rgba(26,18,8,0.4)",
            marginTop: 4 * s,
            marginBottom: 0,
          }}
        >
          Pick your analysis method
        </p>
      </div>
      <MethodCard
        emoji="📸"
        title="Upload Screenshot"
        desc="Drop your convo and get instant AI reply suggestions"
        bg="#E03E00"
        scale={s}
      />
      <MethodCard
        emoji="🎙️"
        title="Voice Mode"
        desc="Talk it out with AI"
        bg="#3B44B0"
        scale={s}
      />
      <MethodCard
        emoji="💜"
        title="Dating Profile Scanner"
        desc="Analyze their profile & vibe"
        bg="linear-gradient(135deg, #9B3FD4, #C563E0)"
        scale={s}
      />
    </div>
  );
}

function MethodCard({
  emoji,
  title,
  desc,
  bg,
  scale,
}: {
  emoji: string;
  title: string;
  desc: string;
  bg: string;
  scale: number;
}) {
  return (
    <div
      style={{
        borderRadius: 16 * scale,
        padding: `${16 * scale}px ${20 * scale}px`,
        background: bg,
      }}
    >
      <span style={{ fontSize: 20 * scale }}>{emoji}</span>
      <p
        className="jakarta"
        style={{
          fontSize: 16 * scale,
          fontWeight: 700,
          color: "#fff",
          marginTop: 6 * scale,
          marginBottom: 0,
        }}
      >
        {title}
      </p>
      <p
        className="jakarta"
        style={{
          fontSize: 12 * scale,
          color: "rgba(255,255,255,0.6)",
          marginTop: 2 * scale,
          marginBottom: 0,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

function RevealContent({
  scale,
  showResults,
}: {
  scale: number;
  showResults: boolean;
}) {
  const s = scale;
  const anim = (delay: number) =>
    showResults ? `gt-staggerIn 0.5s ease ${delay}s both` : "none";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12 * s,
        animation: showResults ? "gt-fadeIn 0.4s ease forwards" : "none",
      }}
    >
      {/* Strategic Tip */}
      <div
        style={{
          borderRadius: 16 * s,
          padding: `${14 * s}px ${16 * s}px`,
          display: "flex",
          alignItems: "flex-start",
          gap: 12 * s,
          background: "linear-gradient(135deg, #3B44B0, #5B63D0)",
          animation: anim(0),
        }}
      >
        <div
          style={{
            width: 36 * s,
            height: 36 * s,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2 * s,
          }}
        >
          <span style={{ fontSize: 15 * s }}>💡</span>
        </div>
        <div>
          <p
            className="jakarta"
            style={{
              fontSize: 10 * s,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Strategic Tip
          </p>
          <p
            className="jakarta"
            style={{
              fontSize: 13 * s,
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.5,
              marginTop: 4 * s,
              marginBottom: 0,
            }}
          >
            Ease tension with warmth, not over-explaining — less is more here.
          </p>
        </div>
      </div>

      {/* Suggested Replies heading */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4 * s,
          animation: anim(0.15),
        }}
      >
        <h3
          className="playfair"
          style={{
            fontSize: 20 * s,
            fontWeight: 700,
            fontStyle: "italic",
            color: "#1A1208",
            margin: 0,
          }}
        >
          Suggested Replies
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6 * s,
            padding: `${6 * s}px ${12 * s}px`,
            borderRadius: 99,
            background: "#E03E00",
          }}
        >
          <span style={{ fontSize: 10 * s }}>💡</span>
          <span
            className="jakarta"
            style={{ fontSize: 11 * s, fontWeight: 700, color: "#fff" }}
          >
            New
          </span>
        </div>
      </div>

      {/* Reply 1 — Recommended */}
      <ReplyCard
        tags={[
          {
            label: "Confident/Brief",
            color: "#E03E00",
            bg: "rgba(224,62,0,0.08)",
          },
          {
            label: "⚡ Recommended",
            color: "#E03E00",
            bg: "rgba(224,62,0,0.06)",
          },
        ]}
        text="Lol I get it, I probably came off wrong. That stuff doesn’t bother me at all though, fr."
        tip="💡 Owns it lightly without over-apologizing, feels genuine."
        highlighted
        scale={s}
        anim={anim(0.25)}
      />

      {/* Reply 2 — Playful */}
      <ReplyCard
        tags={[
          {
            label: "Playful/Teasing",
            color: "#2E7D32",
            bg: "rgba(76,175,80,0.1)",
          },
        ]}
        text="Damn I’m already in trouble and we just met 😂"
        tip="💡 Breaks tension with humor, self-aware without groveling."
        scale={s}
        anim={anim(0.35)}
      />

      {/* Reply 3 — Direct/Bold */}
      <ReplyCard
        tags={[
          {
            label: "Direct/Bold",
            color: "#7B1FA2",
            bg: "rgba(156,100,220,0.1)",
          },
        ]}
        text="Honestly that’s one of the things I’d actually respect — someone who actually shows up for the people in their life."
        tip="💡 Reframes her value positively, cuts through the awkwardness."
        scale={s}
        anim={anim(0.45)}
      />

      {/* Rizz Momentum Index */}
      <div
        style={{
          borderRadius: 16 * s,
          padding: `${16 * s}px`,
          background: "#151530",
          marginBottom: 8 * s,
          animation: anim(0.55),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8 * s,
          }}
        >
          <p
            className="jakarta"
            style={{
              fontSize: 10 * s,
              fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Rizz Momentum Index™
          </p>
          <div
            style={{
              width: 16 * s,
              height: 16 * s,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 8 * s,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              i
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8 * s,
          }}
        >
          <span
            className="jakarta"
            style={{
              fontSize: 42 * s,
              fontWeight: 800,
              color: "#3366FF",
              lineHeight: 1,
            }}
          >
            52
          </span>
          <span
            className="jakarta"
            style={{
              fontSize: 18 * s,
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            %
          </span>
          <span
            className="playfair"
            style={{
              fontSize: 16 * s,
              fontStyle: "italic",
              color: "#E03E00",
              fontWeight: 500,
              marginLeft: 4 * s,
            }}
          >
            Solid Vibes
          </span>
          <span style={{ fontSize: 16 * s, marginLeft: 2 * s }}>😎</span>
        </div>
        <div
          style={{
            marginTop: 10 * s,
            height: 6 * s,
            borderRadius: 99,
            overflow: "hidden",
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "52%",
              borderRadius: 99,
              background: "linear-gradient(90deg, #3366FF, #5588FF)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ReplyCard({
  tags,
  text,
  tip,
  highlighted,
  scale,
  anim,
}: {
  tags: { label: string; color: string; bg: string }[];
  text: string;
  tip: string;
  highlighted?: boolean;
  scale: number;
  anim: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16 * scale,
        padding: `${14 * scale}px ${16 * scale}px`,
        background: highlighted
          ? "rgba(224,62,0,0.04)"
          : "rgba(26,18,8,0.02)",
        border: highlighted
          ? "1.5px solid rgba(224,62,0,0.15)"
          : "1px solid rgba(26,18,8,0.08)",
        animation: anim,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8 * scale,
          marginBottom: 8 * scale,
        }}
      >
        {tags.map((t) => (
          <span
            key={t.label}
            className="jakarta"
            style={{
              fontSize: 10 * scale,
              fontWeight: 700,
              padding: `${2 * scale}px ${8 * scale}px`,
              borderRadius: 99,
              background: t.bg,
              color: t.color,
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <p
        className="jakarta"
        style={{
          fontSize: 15 * scale,
          fontWeight: 700,
          color: "#1A1208",
          lineHeight: 1.35,
          margin: 0,
        }}
      >
        {text}
      </p>
      <p
        className="playfair"
        style={{
          fontSize: 12 * scale,
          fontStyle: "italic",
          color: "rgba(26,18,8,0.4)",
          marginTop: 6 * scale,
          marginBottom: 0,
          lineHeight: 1.5,
        }}
      >
        {tip}
      </p>
    </div>
  );
}

function TabBarItem({
  label,
  active,
  scale = 1,
}: {
  label: string;
  active?: boolean;
  scale?: number;
}) {
  const color = active ? "#E03E00" : "rgba(26,18,8,0.3)";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2 * scale,
      }}
    >
      <svg
        width={22 * scale}
        height={22 * scale}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={active ? 2.5 : 1.5}
      >
        {label === "Analyze" && (
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {label === "Vault" && (
          <>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </>
        )}
        {label === "Profile" && (
          <>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        )}
      </svg>
      <span
        className="jakarta"
        style={{
          fontSize: 11 * scale,
          fontWeight: active ? 700 : 500,
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
}
