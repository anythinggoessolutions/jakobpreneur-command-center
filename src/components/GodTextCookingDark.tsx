"use client";

/**
 * GodText AI — Cooking / Reveal Screen (Dark Theme)
 *
 * 9:16 SAFE ZONE LAYOUT (390x844 native, scaled by `scale` prop)
 * ─────────────────────────────
 * Top dead zone:    0–150px   (platform username, follow button, etc.)
 * Safe zone:        150–674px (524px of usable space)
 * Bottom dead zone: 674–844px (captions, like/comment/share buttons)
 * ─────────────────────────────
 * Strategy: Push the GodText header into the top dead zone. All
 * meaningful content starts at ~150px and ends by ~670px.
 *
 * Fonts: DM Sans + Syne. Background: #0C0C0E. Accent: #FF4400.
 * Features grain overlay and glowing pulse animation on cooking modal.
 */

import { useState, useEffect } from "react";

interface CookingDarkProps {
  phase?: "cooking" | "reveal";
  frozenStep?: number;
  scale?: number;
}

const LOADING_MESSAGES = [
  { icon: "spinner" as const, text: "Analyzing conversation…" },
  { icon: "brain" as const, text: "Understanding context…" },
  { icon: "sparkle" as const, text: "Crafting replies…" },
];

export default function GodTextCookingDark({
  phase = "cooking",
  frozenStep,
  scale = 1,
}: CookingDarkProps) {
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
  const s = scale;

  return (
    <div
      style={{
        width: W,
        height: H,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        background: "#0C0C0E",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

        .syne { font-family: 'Syne', sans-serif; }
        .dm { font-family: 'DM Sans', sans-serif; }

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
        @keyframes gt-glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,68,0,0.15); }
          50% { box-shadow: 0 0 40px rgba(255,68,0,0.3), 0 0 60px rgba(255,68,0,0.1); }
        }
      `}</style>

      {/* Grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 50,
          background:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
      />

      {/* ═══ TOP DEAD ZONE (150px) ═══ */}
      <div
        style={{
          minHeight: 150 * s,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: `0 ${20 * s}px ${8 * s}px`,
          position: "relative",
          zIndex: 10,
        }}
      >
        <h1
          className="syne"
          style={{
            fontSize: 22 * s,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          GodText <span style={{ color: "#FF4400" }}>AI</span>
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20 * s,
            marginTop: 6 * s,
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
              className="dm"
              style={{ fontSize: 13 * s, fontWeight: 700, color: "#fff" }}
            >
              Analyze
            </span>
            <div
              style={{
                width: "100%",
                height: 2.5 * s,
                background: "#FF4400",
                borderRadius: 99,
                marginTop: 2 * s,
              }}
            />
          </div>
          <span
            className="dm"
            style={{
              fontSize: 13 * s,
              fontWeight: 500,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            Rizz Vault
          </span>
          <span
            className="dm"
            style={{
              fontSize: 13 * s,
              fontWeight: 500,
              color: "rgba(255,255,255,0.25)",
            }}
          >
            Profile
          </span>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* ═══ SAFE ZONE (524px) ═══ */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          maxHeight: 524 * s,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: `${16 * s}px ${20 * s}px`,
            overflowY: "auto",
            filter: phase === "cooking" ? "blur(10px)" : "none",
            opacity: phase === "cooking" ? 0.35 : 1,
            transition: "filter 0.5s ease, opacity 0.5s ease",
          }}
        >
          {phase === "cooking" ? (
            <DarkCookingBackground scale={s} />
          ) : (
            <DarkRevealContent scale={s} showResults={showResults} />
          )}
        </div>

        {/* Loading Modal */}
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
                borderRadius: 16 * s,
                padding: `${32 * s}px ${40 * s}px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16 * s,
                margin: `0 ${32 * s}px`,
                background: "rgba(18,18,22,0.95)",
                border: "1px solid rgba(255,68,0,0.12)",
                backdropFilter: "blur(20px)",
                animation:
                  "gt-fadeIn 0.3s ease forwards, gt-glowPulse 3s ease-in-out infinite",
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
                  background: "rgba(255,68,0,0.1)",
                }}
              >
                <DarkLoadingIcon icon={currentLoading.icon} scale={s} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p
                  className="dm"
                  key={loadingStep}
                  style={{
                    fontSize: 18 * s,
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0,
                    animation: "gt-fadeUp 0.3s ease forwards",
                  }}
                >
                  {currentLoading.text}
                </p>
                <p
                  className="dm"
                  style={{
                    fontSize: 14 * s,
                    color: "rgba(255,255,255,0.3)",
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

      {/* ═══ BOTTOM DEAD ZONE (170px) ═══ */}
      <div
        style={{
          minHeight: 170 * s,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            paddingTop: 12 * s,
          }}
        >
          <DarkTabBarItem label="Analyze" active scale={s} />
          <DarkTabBarItem label="Vault" scale={s} />
          <DarkTabBarItem label="Profile" scale={s} />
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function DarkLoadingIcon({
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
          stroke="rgba(255,68,0,0.12)"
          strokeWidth="3"
        />
        <path
          d="M14 3a11 11 0 019.5 5.5"
          stroke="#FF4400"
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
          stroke="#FF4400"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 2V18.5"
          stroke="#FF4400"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 10.5H17"
          stroke="#FF4400"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8.5 14H15.5"
          stroke="#FF4400"
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
      fill="#FF4400"
    >
      <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6Z" />
    </svg>
  );
}

function DarkCookingBackground({ scale }: { scale: number }) {
  const s = scale;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12 * s }}
    >
      <div>
        <h2
          className="syne"
          style={{
            fontSize: 24 * s,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.15,
            margin: 0,
          }}
        >
          Choose How To
          <br />
          Analyze Your Convo.
        </h2>
        <p
          className="dm"
          style={{
            fontSize: 13 * s,
            color: "rgba(255,255,255,0.3)",
            marginTop: 4 * s,
            marginBottom: 0,
          }}
        >
          Pick your analysis method
        </p>
      </div>
      <DarkMethodCard
        emoji="📸"
        title="Upload Screenshot"
        desc="Drop your convo and get instant AI reply suggestions"
        bg="linear-gradient(135deg, #FF4400, #E03000)"
        scale={s}
      />
      <DarkMethodCard
        emoji="🎙️"
        title="Voice Mode"
        desc="Talk it out with AI"
        bg="linear-gradient(135deg, #2A2A5A, #3B44B0)"
        scale={s}
      />
      <DarkMethodCard
        emoji="💜"
        title="Dating Profile Scanner"
        desc="Analyze their profile & vibe"
        bg="linear-gradient(135deg, #7B2FA0, #C563E0)"
        scale={s}
      />
    </div>
  );
}

function DarkMethodCard({
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
        className="dm"
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
        className="dm"
        style={{
          fontSize: 12 * scale,
          color: "rgba(255,255,255,0.5)",
          marginTop: 2 * scale,
          marginBottom: 0,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

function DarkRevealContent({
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
          background: "linear-gradient(135deg, #2A2A5A, #3B44B0)",
          animation: anim(0),
        }}
      >
        <div
          style={{
            width: 36 * s,
            height: 36 * s,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
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
            className="dm"
            style={{
              fontSize: 10 * s,
              fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Strategic Tip
          </p>
          <p
            className="dm"
            style={{
              fontSize: 13 * s,
              color: "rgba(255,255,255,0.85)",
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
          className="syne"
          style={{
            fontSize: 20 * s,
            fontWeight: 800,
            color: "#fff",
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
            background: "#FF4400",
          }}
        >
          <span style={{ fontSize: 10 * s }}>💡</span>
          <span
            className="dm"
            style={{ fontSize: 11 * s, fontWeight: 700, color: "#fff" }}
          >
            New
          </span>
        </div>
      </div>

      {/* Reply 1 — Recommended */}
      <DarkReplyCard
        tags={[
          {
            label: "Confident/Brief",
            color: "#FF6633",
            bg: "rgba(255,68,0,0.12)",
          },
          {
            label: "⚡ Recommended",
            color: "#FF6633",
            bg: "rgba(255,68,0,0.08)",
          },
        ]}
        text="Lol I get it, I probably came off wrong. That stuff doesn’t bother me at all though, fr."
        tip="💡 Owns it lightly without over-apologizing, feels genuine."
        highlighted
        scale={s}
        anim={anim(0.25)}
      />

      {/* Reply 2 — Playful */}
      <DarkReplyCard
        tags={[
          {
            label: "Playful/Teasing",
            color: "#66BB6A",
            bg: "rgba(76,175,80,0.12)",
          },
        ]}
        text="Damn I’m already in trouble and we just met 😂"
        tip="💡 Breaks tension with humor, self-aware without groveling."
        scale={s}
        anim={anim(0.35)}
      />

      {/* Reply 3 — Direct/Bold */}
      <DarkReplyCard
        tags={[
          {
            label: "Direct/Bold",
            color: "#B388FF",
            bg: "rgba(156,100,220,0.12)",
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
          background: "linear-gradient(135deg, #0A0A20, #12122A)",
          border: "1px solid rgba(51,102,255,0.12)",
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
            className="dm"
            style={{
              fontSize: 10 * s,
              fontWeight: 700,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.18em",
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
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 8 * s,
                color: "rgba(255,255,255,0.25)",
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
            className="syne"
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
            className="dm"
            style={{
              fontSize: 18 * s,
              fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            %
          </span>
          <span
            className="dm"
            style={{
              fontSize: 16 * s,
              fontStyle: "italic",
              color: "#FF4400",
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
            background: "rgba(255,255,255,0.06)",
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

function DarkReplyCard({
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
          ? "rgba(255,68,0,0.06)"
          : "rgba(255,255,255,0.03)",
        border: highlighted
          ? "1.5px solid rgba(255,68,0,0.18)"
          : "1px solid rgba(255,255,255,0.07)",
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
            className="dm"
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
        className="dm"
        style={{
          fontSize: 15 * scale,
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1.35,
          margin: 0,
        }}
      >
        {text}
      </p>
      <p
        className="dm"
        style={{
          fontSize: 12 * scale,
          fontStyle: "italic",
          color: "rgba(255,255,255,0.3)",
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

function DarkTabBarItem({
  label,
  active,
  scale = 1,
}: {
  label: string;
  active?: boolean;
  scale?: number;
}) {
  const color = active ? "#FF4400" : "rgba(255,255,255,0.2)";
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
        className="dm"
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
