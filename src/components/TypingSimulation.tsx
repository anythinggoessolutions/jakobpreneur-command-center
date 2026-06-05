"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const FRAME_W = 1080;
const FRAME_H = 1920;

type ChatMessage = {
  sender: "man" | "woman";
  text: string;
};

type PlatformStyle = {
  appBg: string;
  headerText: string;
  manBubble: string;
  manText: string;
  womanBubble: string;
  womanText: string;
  accent: string;
  fontFamily: string;
  label: string;
};

const PLATFORM_STYLES: Record<string, PlatformStyle> = {
  Hinge: {
    appBg: "#1A1A2E",
    headerText: "#FFFFFF",
    manBubble: "#4F2B7A",
    manText: "#FFFFFF",
    womanBubble: "rgba(255,255,255,0.12)",
    womanText: "#FFFFFF",
    accent: "#4F2B7A",
    fontFamily: '"Helvetica Neue", -apple-system, system-ui, sans-serif',
    label: "Hinge",
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
    label: "Instagram",
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
    label: "Tinder",
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
    label: "iMessage",
  },
};

const KB_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"],
  ["123", "🌐", " ", "return"],
];

export default function TypingSimulation({
  messages,
  hookText,
  platform = "iMessage",
  avatarUrl,
  onDone,
  autoStart = false,
}: {
  messages: ChatMessage[];
  hookText?: string;
  platform?: string;
  avatarUrl?: string;
  onDone?: () => void;
  autoStart?: boolean;
}) {
  const s = PLATFORM_STYLES[platform] || PLATFORM_STYLES.iMessage;
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const [typingText, setTypingText] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [sentMessages, typingText, scrollToBottom]);

  useEffect(() => {
    if (autoStart && !started) {
      const t = setTimeout(() => setStarted(true), 500);
      return () => clearTimeout(t);
    }
  }, [autoStart, started]);

  useEffect(() => {
    if (!started || doneRef.current) return;

    let cancelled = false;

    async function playConversation() {
      for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
        if (cancelled) return;
        const msg = messages[msgIdx];

        if (msg.sender === "woman") {
          setShowTypingIndicator(true);
          await wait(800 + Math.random() * 600);
          if (cancelled) return;
          setShowTypingIndicator(false);
          setSentMessages((prev) => [...prev, msg]);
          await wait(400);
        } else {
          // Type character by character — text only shows in input field
          const text = msg.text;
          for (let charIdx = 0; charIdx < text.length; charIdx++) {
            if (cancelled) return;
            const char = text[charIdx];
            setActiveKey(char.toLowerCase());
            setTypingText(text.slice(0, charIdx + 1));
            const delay = char === " " ? 60 : 40 + Math.random() * 50;
            await wait(delay);
          }
          if (cancelled) return;
          setActiveKey(null);
          await wait(300);
          // Hit send — message bubble appears NOW
          setActiveKey("send");
          await wait(200);
          setActiveKey(null);
          setSentMessages((prev) => [...prev, msg]);
          setTypingText("");
          await wait(400);
        }
      }

      if (!cancelled) {
        doneRef.current = true;
        await wait(1500);
        (window as unknown as Record<string, boolean>).__typingDone = true;
        onDone?.();
      }
    }

    playConversation();
    return () => {
      cancelled = true;
    };
  }, [started, messages, onDone]);

  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: s.appBg,
        display: "flex",
        flexDirection: "column",
        fontFamily: s.fontFamily,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Status bar */}
      <div
        style={{
          height: 88,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "0 40px 8px",
          color: "#fff",
          fontSize: 28,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <span>12:33</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>5G</span>
          <BatteryIcon />
        </div>
      </div>

      {/* Platform header */}
      <div
        style={{
          height: 110,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: "linear-gradient(135deg, #7B7B7D, #5A5A5C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
            overflow: "hidden",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: 80,
                height: 80,
                objectFit: "cover",
              }}
            />
          ) : (
            <span style={{ fontSize: 36, color: "#fff" }}>👩</span>
          )}
        </div>
        <span style={{ color: s.headerText, fontSize: 24, fontWeight: 600 }}>
          {s.label}
        </span>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {sentMessages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} style={s} />
        ))}
        {showTypingIndicator && <TypingIndicator womanBubble={s.womanBubble} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Hook text overlay — bottom of safe zone, above keyboard */}
      {hookText && (
        <div
          style={{
            position: "absolute",
            bottom: 520,
            left: 80,
            right: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.15,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              WebkitTextStroke: "2px #000",
              paintOrder: "stroke fill",
              textShadow:
                "0 3px 20px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.95)",
            }}
          >
            {hookText}
          </div>
        </div>
      )}

      {/* Text input bar */}
      <div
        style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: "#3A3A3C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: "#8E8E93",
          }}
        >
          +
        </div>
        <div
          style={{
            flex: 1,
            height: 52,
            borderRadius: 26,
            border: "1.5px solid #3A3A3C",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            color: typingText ? "#fff" : "#8E8E93",
            fontSize: 30,
            overflow: "hidden",
          }}
        >
          {typingText ? renderBlurred(typingText) : s.label}
          {typingText && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 28,
                background: "#fff",
                marginLeft: 1,
                flexShrink: 0,
                animation: "blink 0.8s step-end infinite",
              }}
            />
          )}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: typingText ? s.accent : "#3A3A3C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          <span style={{ fontSize: 24, color: "#fff" }}>↑</span>
        </div>
      </div>

      {/* Keyboard */}
      <Keyboard activeKey={activeKey} accent={s.accent} />

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({
  msg,
  style: s,
}: {
  msg: ChatMessage;
  style: PlatformStyle;
}) {
  const isMan = msg.sender === "man";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMan ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "75%",
          padding: "18px 28px",
          borderRadius: 32,
          borderBottomRightRadius: isMan ? 8 : 32,
          borderBottomLeftRadius: isMan ? 32 : 8,
          background: isMan ? s.manBubble : s.womanBubble,
          color: isMan ? s.manText : s.womanText,
          fontSize: 34,
          fontWeight: 400,
          lineHeight: 1.35,
        }}
      >
        {renderBlurred(msg.text)}
      </div>
    </div>
  );
}

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

function TypingIndicator({ womanBubble }: { womanBubble: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          padding: "18px 24px",
          borderRadius: 32,
          borderBottomLeftRadius: 8,
          background: womanBubble,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: "#8E8E93",
              animation: `typingDot 1.2s infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Keyboard({
  activeKey,
  accent,
}: {
  activeKey: string | null;
  accent: string;
}) {
  const keyW = 88;
  const keyH = 82;
  const gap = 10;
  const kbPadX = 12;
  const kbPadY = 16;
  const rowHeight = keyH + gap;

  return (
    <div
      style={{
        background: "#1C1C1E",
        padding: `${kbPadY}px ${kbPadX}px 48px`,
        flexShrink: 0,
      }}
    >
      {KB_ROWS.map((row, rowIdx) => {
        const isBottomRow = rowIdx === 3;
        return (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              justifyContent: "center",
              gap,
              height: rowHeight,
              alignItems: "flex-start",
            }}
          >
            {row.map((key) => {
              if (isBottomRow) {
                if (key === " ") {
                  return (
                    <Key
                      key={key}
                      label="space"
                      width={480}
                      height={keyH}
                      isActive={activeKey === " "}
                      isSpecial={false}
                      accent={accent}
                    />
                  );
                }
                if (key === "return") {
                  return (
                    <Key
                      key={key}
                      label="return"
                      width={160}
                      height={keyH}
                      isActive={activeKey === "send"}
                      isSpecial
                      accent={accent}
                    />
                  );
                }
                return (
                  <Key
                    key={key}
                    label={key}
                    width={110}
                    height={keyH}
                    isActive={false}
                    isSpecial
                    accent={accent}
                  />
                );
              }
              const isShiftOrDelete = key === "⇧" || key === "⌫";
              return (
                <Key
                  key={key}
                  label={key}
                  width={isShiftOrDelete ? 100 : keyW}
                  height={keyH}
                  isActive={activeKey === key.toLowerCase()}
                  isSpecial={isShiftOrDelete}
                  accent={accent}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Key({
  label,
  width,
  height,
  isActive,
  isSpecial,
  accent,
}: {
  label: string;
  width: number;
  height: number;
  isActive: boolean;
  isSpecial: boolean;
  accent: string;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 10,
        background: isActive ? accent : isSpecial ? "#3A3A3C" : "#4A4A4C",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: label.length > 1 ? 22 : 32,
        fontWeight: 400,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        transition: "background 0.08s",
        textTransform: label.length === 1 ? "uppercase" : "none",
      }}
    >
      {label}
    </div>
  );
}

function BatteryIcon() {
  return (
    <svg width="40" height="20" viewBox="0 0 40 20">
      <rect
        x="1"
        y="2"
        width="33"
        height="16"
        rx="3"
        stroke="#fff"
        strokeWidth="1.5"
        fill="none"
      />
      <rect x="35" y="7" width="3" height="6" rx="1" fill="#fff" />
      <rect x="3" y="4" width="25" height="12" rx="1.5" fill="#4CD964" />
    </svg>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
