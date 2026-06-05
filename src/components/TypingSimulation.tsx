"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const FRAME_W = 1080;
const FRAME_H = 1920;

type ChatMessage = {
  sender: "man" | "woman";
  text: string;
};

// iOS keyboard layout
const KB_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"],
  ["123", "🌐", " ", "return"],
];

export default function TypingSimulation({
  messages,
  hookText,
  onDone,
  autoStart = false,
}: {
  messages: ChatMessage[];
  hookText?: string;
  onDone?: () => void;
  autoStart?: boolean;
}) {
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const [typingText, setTypingText] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [currentSender, setCurrentSender] = useState<"man" | "woman">("man");
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [started, setStarted] = useState(false);
  const [showHook, setShowHook] = useState(!!hookText);
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
      const t = setTimeout(() => {
        setShowHook(false);
        setStarted(true);
      }, hookText ? 2500 : 100);
      return () => clearTimeout(t);
    }
  }, [autoStart, started, hookText]);

  useEffect(() => {
    if (!started || doneRef.current) return;

    let cancelled = false;

    async function playConversation() {
      for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
        if (cancelled) return;
        const msg = messages[msgIdx];
        setCurrentSender(msg.sender);

        if (msg.sender === "woman") {
          // Woman's messages: show typing indicator, then message appears
          setShowTypingIndicator(true);
          await wait(800 + Math.random() * 600);
          if (cancelled) return;
          setShowTypingIndicator(false);
          setSentMessages((prev) => [...prev, msg]);
          await wait(400);
        } else {
          // Man's messages: type character by character with key highlights
          const text = msg.text;
          for (let charIdx = 0; charIdx < text.length; charIdx++) {
            if (cancelled) return;
            const char = text[charIdx];
            const keyToHighlight = char.toLowerCase();
            setActiveKey(keyToHighlight);
            setTypingText(text.slice(0, charIdx + 1));
            // Vary typing speed for realism
            const delay = char === " " ? 60 : 40 + Math.random() * 50;
            await wait(delay);
          }
          if (cancelled) return;
          setActiveKey(null);
          // Brief pause before "sending"
          await wait(300);
          // Hit send
          setActiveKey("send");
          await wait(150);
          setActiveKey(null);
          setSentMessages((prev) => [...prev, msg]);
          setTypingText("");
          await wait(400);
        }
      }

      if (!cancelled) {
        doneRef.current = true;
        // Hold the final state for a moment
        await wait(1500);
        // Signal to Playwright that the animation is done
        (window as unknown as Record<string, boolean>).__typingDone = true;
        onDone?.();
      }
    }

    playConversation();
    return () => {
      cancelled = true;
    };
  }, [started, messages, onDone]);

  if (showHook && hookText) {
    return (
      <div
        style={{
          width: FRAME_W,
          height: FRAME_H,
          background: "#000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.2,
            padding: "0 80px",
          }}
        >
          {hookText}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: FRAME_W,
        height: FRAME_H,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        overflow: "hidden",
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

      {/* iMessage header */}
      <div
        style={{
          height: 110,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          borderBottom: "1px solid #1C1C1E",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            background: "linear-gradient(135deg, #7B7B7D, #5A5A5C)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 28, color: "#fff" }}>👩</span>
        </div>
        <span style={{ color: "#fff", fontSize: 24, fontWeight: 600 }}>
          iMessage
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
          <MessageBubble key={i} msg={msg} />
        ))}
        {showTypingIndicator && <TypingIndicator />}
        {typingText && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                maxWidth: "75%",
                padding: "18px 28px",
                borderRadius: 32,
                borderBottomRightRadius: 8,
                background: "#0B84FE",
                color: "#fff",
                fontSize: 34,
                fontWeight: 400,
                lineHeight: 1.35,
                opacity: 0.7,
              }}
            >
              {typingText}
              <span
                style={{
                  display: "inline-block",
                  width: 3,
                  height: 32,
                  background: "#fff",
                  marginLeft: 2,
                  verticalAlign: "middle",
                  animation: "blink 0.8s step-end infinite",
                }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Text input bar */}
      <div
        style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 16,
          borderTop: "1px solid #1C1C1E",
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
          }}
        >
          {typingText || "iMessage"}
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: typingText ? "#0B84FE" : "#3A3A3C",
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
      <Keyboard activeKey={activeKey} />

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

function MessageBubble({ msg }: { msg: ChatMessage }) {
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
          background: isMan ? "#0B84FE" : "#26252A",
          color: "#fff",
          fontSize: 34,
          fontWeight: 400,
          lineHeight: 1.35,
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          padding: "18px 24px",
          borderRadius: 32,
          borderBottomLeftRadius: 8,
          background: "#26252A",
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

function Keyboard({ activeKey }: { activeKey: string | null }) {
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
}: {
  label: string;
  width: number;
  height: number;
  isActive: boolean;
  isSpecial: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 10,
        background: isActive ? "#0B84FE" : isSpecial ? "#3A3A3C" : "#4A4A4C",
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
