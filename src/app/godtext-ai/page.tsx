"use client";

import { useState, useEffect, useCallback } from "react";
import GodTextVaultGrid from "@/components/GodTextVaultGrid";
import GodTextPhoneMockup, {
  type PhonePlatform,
  type ChatMessage,
} from "@/components/GodTextPhoneMockup";
import GodTextGeneratingScreen from "@/components/GodTextGeneratingScreen";
import GodTextCookingWhite from "@/components/GodTextCookingWhite";
import GodTextCookingDark from "@/components/GodTextCookingDark";

const TIME_SLOTS: { value: string; label: string }[] = [];
for (let h = 7; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 22 && m > 30) break;
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
    TIME_SLOTS.push({ value, label });
  }
}
const SLOT_VALUES = TIME_SLOTS.map((s) => s.value);
const SLOT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TIME_SLOTS.map((s) => [s.value, s.label]),
);

type GeneratedConversation = {
  scenario: string;
  platform: PhonePlatform;
  womanName?: string;
  hookText: string;
  messages: {
    sender: "man" | "woman";
    text: string;
    show_godtext_ui?: boolean;
    escalation_level?: "low" | "medium" | "high" | "maximum";
  }[];
};

export default function GodTextAIPage() {
  const [conversations, setConversations] = useState<GeneratedConversation[]>([]);
  const [activeConvIdx, setActiveConvIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [referenceCount, setReferenceCount] = useState<number | null>(null);
  const [previewFrame, setPreviewFrame] = useState<number>(0);
  const [genCount, setGenCount] = useState(1);
  const [genProgress, setGenProgress] = useState<string | null>(null);
  const [assembling, setAssembling] = useState(false);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<{
    outputPath: string;
    durationSeconds: number;
    frameCount: number;
    videoUrl?: string;
  } | null>(null);
  const [videoTheme, setVideoTheme] = useState<"dark" | "white">("dark");
  const [buildFormat, setBuildFormat] = useState<"video" | "carousel" | "typing">("video");
  const [carouselResult, setCarouselResult] = useState<{
    slideUrls: string[];
  } | null>(null);
  const [cookingPreview, setCookingPreview] = useState<"off" | "white-cooking" | "white-reveal" | "dark-cooking" | "dark-reveal">("off");
  const [savedScripts, setSavedScripts] = useState<
    { id: string; name: string; platform: string; hookText: string; conversation: GeneratedConversation | null; createdTime: string }[]
  >([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<{
    postId: string;
    status: string;
    scheduledFor: string;
  } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => {
    // Default to today
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [scheduleSlot, setScheduleSlot] = useState("07:00");
  // Map of "YYYY-MM-DD|HH:MM" → true for slots that already have a post scheduled
  const [bookedSlots, setBookedSlots] = useState<Record<string, boolean>>({});

  const conversation = conversations[activeConvIdx] ?? null;

  const fetchSavedScripts = useCallback(async () => {
    setLoadingScripts(true);
    try {
      const res = await fetch("/api/godtext/scripts/list", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setSavedScripts(data.scripts || []);
    } catch {
      // non-fatal
    } finally {
      setLoadingScripts(false);
    }
  }, []);

  // Fetch scheduled posts to know which time slots are already booked
  const fetchBookedSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/godtext/post-everywhere/posts?status=scheduled", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const posts = Array.isArray(data.posts) ? data.posts : [];
      const slots: Record<string, boolean> = {};
      for (const post of posts) {
        const sf = post.scheduled_for;
        if (!sf) continue;
        // Parse the scheduled_for datetime and extract date + nearest slot.
        // PE stores Eastern time with a fake Z suffix, so use UTC to read
        // the raw values without any timezone shift.
        const dt = new Date(sf);
        const dateStr = dt.toLocaleDateString("en-CA", { timeZone: "UTC" });
        const hours = dt.toLocaleString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hour12: false });
        // Match to the nearest slot time (within 30 min)
        const hhmm = hours.replace(/ /g, "").trim();
        const [h, m] = hhmm.split(":").map(Number);
        const totalMins = h * 60 + m;
        for (const slot of SLOT_VALUES) {
          const [sh, sm] = slot.split(":").map(Number);
          const slotMins = sh * 60 + sm;
          if (Math.abs(totalMins - slotMins) <= 7) {
            slots[`${dateStr}|${slot}`] = true;
            break;
          }
        }
      }
      setBookedSlots(slots);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchSavedScripts();
    fetchBookedSlots();
  }, [fetchSavedScripts, fetchBookedSlots]);

  const loadScript = (script: typeof savedScripts[number]) => {
    if (!script.conversation) return;
    setConversations([script.conversation]);
    setActiveConvIdx(0);
    setPreviewFrame(0);
    setVideoResult(null);
    setAssembleError(null);
  };

  const runGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    setGenProgress(genCount > 1 ? `Generating ${genCount} scripts…` : null);
    try {
      const res = await fetch("/api/godtext/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: genCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const convs = (data.results || [])
        .filter((r: { success: boolean }) => r.success)
        .map((r: { conversation: GeneratedConversation }) => r.conversation);
      if (convs.length === 0) {
        throw new Error(
          data.results?.[0]?.error || "All generations failed"
        );
      }
      setConversations(convs);
      setActiveConvIdx(0);
      setReferenceCount(data.referenceVaultSize ?? null);
      setPreviewFrame(0);
      if (data.failed > 0) {
        setGenError(`${data.succeeded} succeeded, ${data.failed} failed`);
      }
      fetchSavedScripts();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  };

  const runAssemble = async () => {
    if (!conversation) return;
    setAssembling(true);
    setAssembleError(null);
    setVideoResult(null);
    setCarouselResult(null);
    try {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (buildFormat === "carousel") {
        const buildUrl = isLocal
          ? "/api/godtext/carousels/build"
          : "http://localhost:3000/api/godtext/carousels/build";

        const res = await fetch(buildUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation, theme: videoTheme }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        setCarouselResult({
          slideUrls: data.slideUrls || [],
        });
      } else if (buildFormat === "typing") {
        const buildUrl = isLocal
          ? "/api/godtext/videos/typing-build"
          : "http://localhost:3000/api/godtext/videos/typing-build";

        const res = await fetch(buildUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation }),
          signal: AbortSignal.timeout(300000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        setVideoResult({
          outputPath: "",
          durationSeconds: 0,
          frameCount: 0,
          videoUrl: data.videoUrl,
        });
      } else {
        const buildUrl = isLocal
          ? "/api/godtext/videos/build"
          : "http://localhost:3000/api/godtext/videos/build";

        const res = await fetch(buildUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation, theme: videoTheme }),
          signal: AbortSignal.timeout(300000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        setVideoResult({
          outputPath: "",
          durationSeconds: 0,
          frameCount: 0,
          videoUrl: data.videoUrl,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setAssembleError(
          "Can't reach your Mac. Make sure it's on and the Command Center Server is running."
        );
      } else {
        setAssembleError(msg);
      }
    } finally {
      setAssembling(false);
    }
  };

  const runSchedule = async () => {
    if (!videoResult?.videoUrl) return;
    setScheduling(true);
    setScheduleError(null);
    setScheduleResult(null);
    try {
      // Pass the Eastern time directly — PE applies the timezone field itself,
      // so we must NOT convert to UTC (that would double-offset).
      const scheduledFor = `${scheduleDate}T${scheduleSlot}:00`;

      const res = await fetch("/api/godtext/post-everywhere/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoResult.videoUrl,
          scheduledFor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setScheduleResult({
        postId: data.postId,
        status: data.status,
        scheduledFor: `${scheduleDate} at ${SLOT_LABEL_MAP[scheduleSlot] || scheduleSlot}`,
      });
      // Refresh booked slots so the UI immediately reflects the new booking
      fetchBookedSlots();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : String(err));
    } finally {
      setScheduling(false);
    }
  };

  // Walk the conversation as a sequence of preview frames so Jakob can
  // scrub through what each video beat will look like:
  //   - frame 0:        empty conversation (just the chat header)
  //   - frame i (odd):  generating screen using the next man message
  //   - frame i (even): conversation with messages[0..i/2] visible
  // Simplified: even frames show the chat, odd frames show generating.
  const buildFrames = (conv: GeneratedConversation) => {
    const frames: Array<
      | { kind: "phone"; messages: ChatMessage[] }
      | { kind: "cooking" }
      | { kind: "reply"; text: string }
    > = [];

    const visible: ChatMessage[] = [];
    for (let i = 0; i < conv.messages.length; i++) {
      const m = conv.messages[i];
      if (m.sender === "man" && m.show_godtext_ui) {
        // Cooking loading → reply screen → phone with message sent
        frames.push({ kind: "cooking" });
        frames.push({ kind: "reply", text: m.text });
      }
      visible.push({ sender: m.sender, text: m.text });
      frames.push({ kind: "phone", messages: [...visible] });
    }
    return frames;
  };

  const frames = conversation ? buildFrames(conversation) : [];
  const currentFrame = frames[previewFrame];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">GodText AI — Content Lab</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Generate viral short-form videos for the GodText AI app. All content
            here is GodText AI branded — fully separate from JakobPreneur.
          </p>
        </header>

        {/* --- Section 1: Rizz Vault --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="rizz"
            title="Rizz Vault"
            description="Screenshots of viral text-rizz conversations. Claude studies these as style reference when generating new scripts."
            defaultCollapsed
          />
        </section>

        {/* --- Section 1.5: UI References --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="ui-refs"
            title="Platform UI References"
            description="Real chat UI screenshots — Hinge, Instagram DMs, Tinder, iMessage. Design reference for the phone-mockup component. Upload once, used forever."
            defaultCollapsed
          />
        </section>

        {/* --- Section 2: Hype Clip Vault --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="hype-clips"
            title="Hype Clip Vault"
            description="Short viral / meme video clips inserted between conversation beats. Random selection per video."
            defaultCollapsed
          />
        </section>

        {/* --- Section 2.5: Music Vault --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="music"
            title="Music Vault"
            description="Background music. One track plays as a base layer through the full video; hype-clip audio layers on top."
            defaultCollapsed
          />
        </section>

        {/* --- Section 2.52: Intro Audio --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="intro-audio"
            title="Intro Audio"
            description="Sound that plays at the start of every video over the hook frame (~4 seconds). Upload one audio file."
            defaultCollapsed
          />
        </section>

        {/* --- Section 2.55: Hook Backgrounds Vault --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="hook-backgrounds"
            title="Hook Backgrounds"
            description="Short action videos (3-5s) that play behind the hook text at the start of each video. Upload or generate with Higgs Field."
            defaultCollapsed
          />
        </section>

        {/* --- Section 2.6: Baddie Photos Vault --- */}
        <section className="mb-6">
          <GodTextVaultGrid
            kind="baddie-photos"
            title="Baddie Photos"
            description="AI-generated photos of the woman being texted. Shown for 2-3s after the hook. Generate 35/week for 5 videos/day."
            defaultCollapsed
          />
        </section>

        {/* --- Section 2.75: Saved Scripts --- */}
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Saved Scripts</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Every generated script is saved automatically. Click one to load it back into the preview.
              </p>
            </div>
            <button
              onClick={fetchSavedScripts}
              disabled={loadingScripts}
              className="text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-40"
            >
              {loadingScripts ? "Loading…" : "Refresh"}
            </button>
          </div>
          {savedScripts.length === 0 ? (
            <div className="text-xs text-zinc-400">
              {loadingScripts ? "Loading…" : "No saved scripts yet. Generate one below."}
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {savedScripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadScript(s)}
                  disabled={!s.conversation}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-zinc-100 px-3 py-2 text-left transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-800 truncate">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {s.hookText}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                      {s.platform}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(s.createdTime).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* --- Section 2.8: Cooking Screen Preview --- */}
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Cooking Screen Preview</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Preview the GodText AI cooking / reveal screens that play
                during video beats. These are the actual app UI components.
              </p>
            </div>
            <select
              value={cookingPreview}
              onChange={(e) => setCookingPreview(e.target.value as typeof cookingPreview)}
              className="rounded border border-zinc-200 bg-white text-xs px-2 py-2"
            >
              <option value="off">Select preview…</option>
              <option value="dark-cooking">Dark — Cooking</option>
              <option value="dark-reveal">Dark — Reveal</option>
              <option value="white-cooking">White — Cooking</option>
              <option value="white-reveal">White — Reveal</option>
            </select>
          </div>
          {cookingPreview !== "off" && (
            <div className="flex justify-center py-4 bg-zinc-100 rounded-lg">
              {cookingPreview.startsWith("white") ? (
                <GodTextCookingWhite
                  phase={cookingPreview.endsWith("cooking") ? "cooking" : "reveal"}
                  scale={0.55}
                />
              ) : (
                <GodTextCookingDark
                  phase={cookingPreview.endsWith("cooking") ? "cooking" : "reveal"}
                  scale={0.55}
                />
              )}
            </div>
          )}
        </section>

        {/* --- Section 3: Video Generator --- */}
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Video Generator</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Generate scripts using the Rizz Vault as visual reference,
                then preview every video beat using Components A and B before
                stitching the final MP4 (next phase).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                disabled={generating}
                className="rounded border border-zinc-200 bg-white text-xs px-2 py-2 disabled:opacity-40"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "script" : "scripts"}
                  </option>
                ))}
              </select>
              <button
                onClick={runGenerate}
                disabled={generating}
                className="bg-zinc-900 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:bg-zinc-300 cursor-pointer whitespace-nowrap"
              >
                {generating ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>

          {genProgress && (
            <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
              {genProgress}
            </div>
          )}

          {genError && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {genError}
            </div>
          )}

          {referenceCount !== null && referenceCount === 0 && (
            <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              No rizz-vault screenshots yet — upload a few above for sharper
              output. Claude still generates without them, but quality jumps
              significantly with 3-6 reference images.
            </div>
          )}

          {conversations.length > 1 && (
            <div className="flex gap-1 mb-3 flex-wrap">
              {conversations.map((c, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveConvIdx(i);
                    setPreviewFrame(0);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    i === activeConvIdx
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Script {i + 1}
                  <span className="ml-1 opacity-60">({c.platform})</span>
                </button>
              ))}
            </div>
          )}

          {conversation && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: metadata + JSON */}
              <div>
                <div className="text-xs text-zinc-500 mb-2">
                  <span className="font-semibold text-zinc-700">Scenario:</span>{" "}
                  {conversation.scenario}
                </div>
                <div className="text-xs text-zinc-500 mb-2">
                  <span className="font-semibold text-zinc-700">Platform:</span>{" "}
                  {conversation.platform}
                </div>
                <div className="text-xs text-zinc-500 mb-3">
                  <span className="font-semibold text-zinc-700">Hook:</span>{" "}
                  &ldquo;{conversation.hookText}&rdquo;
                </div>

                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Frame {previewFrame + 1} of {frames.length}
                </div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setPreviewFrame((i) => Math.max(0, i - 1))}
                    disabled={previewFrame === 0}
                    className="px-3 py-1 rounded border border-zinc-300 text-xs disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() =>
                      setPreviewFrame((i) => Math.min(frames.length - 1, i + 1))
                    }
                    disabled={previewFrame >= frames.length - 1}
                    className="px-3 py-1 rounded border border-zinc-300 text-xs disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>

                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer font-semibold text-zinc-700">
                    Raw conversation JSON
                  </summary>
                  <pre className="mt-2 bg-zinc-100 rounded p-2 overflow-auto text-[11px] leading-snug max-h-96">
                    {JSON.stringify(conversation, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Right: live preview */}
              <div className="flex justify-center items-start">
                {currentFrame?.kind === "phone" ? (
                  <GodTextPhoneMockup
                    platform={conversation.platform}
                    messages={currentFrame.messages}
                    womanName={conversation.womanName}
                    scale={0.8}
                  />
                ) : currentFrame?.kind === "cooking" ? (
                  videoTheme === "white" ? (
                    <GodTextCookingWhite phase="cooking" scale={0.8} />
                  ) : (
                    <GodTextCookingDark phase="cooking" scale={0.8} />
                  )
                ) : currentFrame?.kind === "reply" ? (
                  <ReplyPreview
                    text={currentFrame.text}
                    theme={videoTheme}
                    scale={0.8}
                  />
                ) : null}
              </div>
            </div>
          )}
        </section>

        {/* --- Section 3.75: Build Video --- */}
        {conversation && (
          <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">
                  Build {buildFormat === "carousel" ? "Carousel" : buildFormat === "typing" ? "Typing Video" : "Video"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {buildFormat === "carousel"
                    ? "Generate carousel slides from the selected script. Posts to TikTok."
                    : buildFormat === "typing"
                    ? "iMessage typing simulation — keys light up as messages are typed. Posts to all platforms."
                    : "Assemble a 1080x1920 MP4 from the selected script. Posts to all platforms."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={buildFormat}
                  onChange={(e) => {
                    setBuildFormat(e.target.value as "video" | "carousel" | "typing");
                    setVideoResult(null);
                    setCarouselResult(null);
                    setAssembleError(null);
                  }}
                  disabled={assembling}
                  className="rounded border border-zinc-200 bg-white text-xs px-2 py-2 disabled:opacity-40"
                >
                  <option value="video">Video</option>
                  <option value="typing">Typing Video</option>
                  <option value="carousel">Carousel</option>
                </select>
                <select
                  value={videoTheme}
                  onChange={(e) => setVideoTheme(e.target.value as "dark" | "white")}
                  disabled={assembling}
                  className="rounded border border-zinc-200 bg-white text-xs px-2 py-2 disabled:opacity-40"
                >
                  <option value="dark">Dark Theme</option>
                  <option value="white">White Theme</option>
                </select>
                <button
                  onClick={runAssemble}
                  disabled={assembling}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"
                >
                  {assembling
                    ? "Building…"
                    : buildFormat === "carousel"
                      ? "Build Carousel"
                      : buildFormat === "typing"
                        ? "Build Typing Video"
                        : "Build Video"}
                </button>
              </div>
            </div>

            {assembling && (
              <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                {buildFormat === "carousel"
                  ? "Building carousel — screenshotting slides, uploading images. This takes 1-2 minutes. Don’t close this tab."
                  : buildFormat === "typing"
                  ? "Recording typing simulation — Playwright is capturing the animation. This takes 1-2 minutes. Don’t close this tab."
                  : "Building video — screenshotting frames, encoding MP4, uploading. This takes 1-2 minutes. Don’t close this tab."}
              </div>
            )}

            {assembleError && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                {assembleError}
              </div>
            )}

            {carouselResult && (
              <div className="text-xs bg-green-50 border border-green-200 rounded px-3 py-3">
                <div className="font-semibold text-green-800 mb-2">
                  Carousel ready! {carouselResult.slideUrls.length} slides
                </div>

                {/* Slide preview — horizontal scroll */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  {carouselResult.slideUrls.map((url, i) => (
                    <div key={i} className="shrink-0 relative">
                      <img
                        src={url}
                        alt={`Slide ${i + 1}`}
                        className="h-48 w-auto rounded-lg border border-zinc-200"
                      />
                      <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={scheduleDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setScheduleDate(newDate);
                      const firstOpen = SLOT_VALUES.find((s) => !bookedSlots[`${newDate}|${s}`]);
                      if (firstOpen) setScheduleSlot(firstOpen);
                    }}
                    disabled={scheduling}
                    className="rounded border border-green-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
                  >
                    {Array.from({ length: 14 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() + i);
                      const val = d.toISOString().split("T")[0];
                      const label = d.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      const slotsTotal = SLOT_VALUES.length;
                      const slotsBooked = SLOT_VALUES.filter(
                        (s) => bookedSlots[`${val}|${s}`],
                      ).length;
                      const slotsOpen = slotsTotal - slotsBooked;
                      return (
                        <option key={val} value={val}>
                          {label}{slotsBooked > 0 ? ` (${slotsOpen}/${slotsTotal} open)` : ""}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={scheduleSlot}
                    onChange={(e) => setScheduleSlot(e.target.value)}
                    disabled={scheduling}
                    className="rounded border border-green-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
                  >
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookedSlots[`${scheduleDate}|${slot.value}`];
                      return (
                        <option
                          key={slot.value}
                          value={slot.value}
                          disabled={isBooked}
                        >
                          {slot.label}{isBooked ? " ✓ BOOKED" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={async () => {
                      if (!carouselResult?.slideUrls.length) return;
                      setScheduling(true);
                      setScheduleError(null);
                      setScheduleResult(null);
                      try {
                        const scheduledFor = `${scheduleDate}T${scheduleSlot}:00`;
                        const res = await fetch("/api/godtext/carousels/schedule", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            slideUrls: carouselResult.slideUrls,
                            scheduledFor,
                            hookText: conversation?.hookText,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                        setScheduleResult({
                          postId: data.postId,
                          status: data.status,
                          scheduledFor: `${scheduleDate} at ${SLOT_LABEL_MAP[scheduleSlot] || scheduleSlot}`,
                        });
                        fetchBookedSlots();
                      } catch (err) {
                        setScheduleError(err instanceof Error ? err.message : String(err));
                      } finally {
                        setScheduling(false);
                      }
                    }}
                    disabled={scheduling}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    {scheduling ? "Scheduling…" : "Schedule to TikTok"}
                  </button>
                </div>

                {scheduleError && (
                  <div className="mt-2 text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                    {scheduleError}
                  </div>
                )}

                {scheduleResult && (
                  <div className="mt-2 text-purple-800 bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
                    Scheduled! Post ID: <code className="bg-purple-100 px-1 rounded">{scheduleResult.postId}</code>
                    {" "}— {scheduleResult.scheduledFor} (ET) to TikTok
                  </div>
                )}
              </div>
            )}

            {videoResult && (
              <div className="text-xs bg-green-50 border border-green-200 rounded px-3 py-3">
                <div className="font-semibold text-green-800 mb-2">
                  Video ready! 🎬
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={videoResult.videoUrl || `/api/godtext/videos/download?path=${encodeURIComponent(videoResult.outputPath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-block bg-green-700 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Download MP4
                  </a>

                  {videoResult.videoUrl && (
                    <>
                      <span className="text-green-600 mx-1">|</span>
                      <select
                        value={scheduleDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setScheduleDate(newDate);
                          // Auto-select the first available slot for this date
                          const firstOpen = SLOT_VALUES.find((s) => !bookedSlots[`${newDate}|${s}`]);
                          if (firstOpen) setScheduleSlot(firstOpen);
                        }}
                        disabled={scheduling}
                        className="rounded border border-green-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
                      >
                        {Array.from({ length: 14 }, (_, i) => {
                          const d = new Date();
                          d.setDate(d.getDate() + i);
                          const val = d.toISOString().split("T")[0];
                          const label = d.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          });
                          const slotsTotal = SLOT_VALUES.length;
                          const slotsBooked = SLOT_VALUES.filter(
                            (s) => bookedSlots[`${val}|${s}`],
                          ).length;
                          const slotsOpen = slotsTotal - slotsBooked;
                          return (
                            <option key={val} value={val}>
                              {label}{slotsBooked > 0 ? ` (${slotsOpen}/${slotsTotal} open)` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        value={scheduleSlot}
                        onChange={(e) => setScheduleSlot(e.target.value)}
                        disabled={scheduling}
                        className="rounded border border-green-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
                      >
                        {TIME_SLOTS.map((slot) => {
                          const isBooked = bookedSlots[`${scheduleDate}|${slot.value}`];
                          return (
                            <option
                              key={slot.value}
                              value={slot.value}
                              disabled={isBooked}
                            >
                              {slot.label}{isBooked ? " ✓ BOOKED" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={runSchedule}
                        disabled={scheduling}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
                      >
                        {scheduling ? "Scheduling…" : "Schedule to Socials"}
                      </button>
                    </>
                  )}
                </div>

                {scheduleError && (
                  <div className="mt-2 text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                    {scheduleError}
                  </div>
                )}

                {scheduleResult && (
                  <div className="mt-2 text-purple-800 bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
                    Scheduled! Post ID: <code className="bg-purple-100 px-1 rounded">{scheduleResult.postId}</code>
                    {" "}— {scheduleResult.scheduledFor} (ET) to TikTok, Instagram Reels, YouTube Shorts
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* --- Section 3.9: Thirst Trap Carousel --- */}
        <ThirstTrapSection
          bookedSlots={bookedSlots}
          fetchBookedSlots={fetchBookedSlots}
        />

        {/* --- Section 3.95: Video Rebranding --- */}
        <VideoRebrandSection />

        {/* --- Section 3.97: Upload & Schedule Video --- */}
        <VideoUploadSection
          bookedSlots={bookedSlots}
          fetchBookedSlots={fetchBookedSlots}
        />

        {/* --- Section 4: Content Calendar --- */}
        <ScheduledPostsFeed />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thirst Trap Carousel — standalone section with its own generate + build
// ---------------------------------------------------------------------------

function ThirstTrapSection({
  bookedSlots,
  fetchBookedSlots,
}: {
  bookedSlots: Record<string, boolean>;
  fetchBookedSlots: () => Promise<void>;
}) {
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    slideUrls: string[];
    topic: string;
  } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<{
    postId: string;
    status: string;
    scheduledFor: string;
  } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [scheduleSlot, setScheduleSlot] = useState("07:00");

  const runBuild = async () => {
    setBuilding(true);
    setError(null);
    setResult(null);
    setScheduleResult(null);
    try {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const buildUrl = isLocal
        ? "/api/godtext/carousels/thirst-trap"
        : "http://localhost:3000/api/godtext/carousels/thirst-trap";

      const res = await fetch(buildUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setResult({
        slideUrls: data.slideUrls || [],
        topic: data.topic || "",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError(
          "Can't reach your Mac. Make sure it's on and the Command Center Server is running.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setBuilding(false);
    }
  };

  const runSchedule = async () => {
    if (!result?.slideUrls.length) return;
    setScheduling(true);
    setScheduleError(null);
    setScheduleResult(null);
    try {
      const scheduledFor = `${scheduleDate}T${scheduleSlot}:00`;
      const res = await fetch("/api/godtext/carousels/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideUrls: result.slideUrls,
          scheduledFor,
          hookText: result.topic,
          accountIds: [6124, 6313, 6282], // Instagram + GodText TikTok (godtextai) + Smoothreply TikTok
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setScheduleResult({
        postId: data.postId,
        status: data.status,
        scheduledFor: `${scheduleDate} at ${SLOT_LABEL_MAP[scheduleSlot] || scheduleSlot}`,
      });
      fetchBookedSlots();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : String(err));
    } finally {
      setScheduling(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50/60 to-orange-50/40 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">
            Thirst Trap Psychological Carousel
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            AI-generated carousel with baddie photos + psychology-driven
            texting tips that keep them swiping. Posts to TikTok + Instagram.
          </p>
        </div>
        <button
          onClick={runBuild}
          disabled={building}
          className="bg-gradient-to-r from-pink-600 to-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"
        >
          {building ? "Generating…" : "Generate Thirst Trap Carousel"}
        </button>
      </div>

      {building && (
        <div className="mb-3 text-xs text-pink-700 bg-pink-50 border border-pink-200 rounded px-2 py-1.5">
          Generating slide content with AI, downloading baddie photos,
          rendering slides. This takes 1-2 minutes.
        </div>
      )}

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      {result && (
        <div className="text-xs bg-green-50 border border-green-200 rounded px-3 py-3">
          <div className="font-semibold text-green-800 mb-2">
            Carousel ready! {result.slideUrls.length} slides —{" "}
            &ldquo;{result.topic}&rdquo;
          </div>

          {/* Slide preview */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {result.slideUrls.map((url, i) => (
              <div key={i} className="shrink-0 relative">
                <img
                  src={url}
                  alt={`Slide ${i + 1}`}
                  className="h-48 w-auto rounded-lg border border-zinc-200"
                />
                <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {i + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={scheduleDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setScheduleDate(newDate);
                const firstOpen = SLOT_VALUES.find(
                  (s) => !bookedSlots[`${newDate}|${s}`],
                );
                if (firstOpen) setScheduleSlot(firstOpen);
              }}
              disabled={scheduling}
              className="rounded border border-green-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
            >
              {Array.from({ length: 14 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const val = d.toISOString().split("T")[0];
                const label = d.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const slotsTotal = SLOT_VALUES.length;
                const slotsBooked = SLOT_VALUES.filter(
                  (s) => bookedSlots[`${val}|${s}`],
                ).length;
                const slotsOpen = slotsTotal - slotsBooked;
                return (
                  <option key={val} value={val}>
                    {label}
                    {slotsBooked > 0
                      ? ` (${slotsOpen}/${slotsTotal} open)`
                      : ""}
                  </option>
                );
              })}
            </select>
            <select
              value={scheduleSlot}
              onChange={(e) => setScheduleSlot(e.target.value)}
              disabled={scheduling}
              className="rounded border border-green-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
            >
              {TIME_SLOTS.map((slot) => {
                const isBooked =
                  bookedSlots[`${scheduleDate}|${slot.value}`];
                return (
                  <option
                    key={slot.value}
                    value={slot.value}
                    disabled={isBooked}
                  >
                    {slot.label}
                    {isBooked ? " ✓ BOOKED" : ""}
                  </option>
                );
              })}
            </select>
            <button
              onClick={runSchedule}
              disabled={scheduling}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              {scheduling
                ? "Scheduling…"
                : "Schedule to TikTok + Instagram"}
            </button>
          </div>

          {scheduleError && (
            <div className="mt-2 text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {scheduleError}
            </div>
          )}

          {scheduleResult && (
            <div className="mt-2 text-purple-800 bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
              Scheduled! Post ID:{" "}
              <code className="bg-purple-100 px-1 rounded">
                {scheduleResult.postId}
              </code>{" "}
              — {scheduleResult.scheduledFor} (ET) to TikTok + Instagram
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Inline preview of the "Send this" reply screen shown in the video between
 *  cooking and the phone conversation. Mirrors the RenderFrame ReplyFrame. */
function ReplyPreview({
  text,
  theme,
  scale,
}: {
  text: string;
  theme: "dark" | "white";
  scale: number;
}) {
  const isDark = theme === "dark";
  const bg = isDark ? "#0C0C0E" : "#F5F1EB";
  const accent = isDark ? "#FF4400" : "#E03E00";
  const textColor = isDark ? "#fff" : "#1A1208";
  const mutedColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(26,18,8,0.4)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(26,18,8,0.03)";
  const cardBorder = isDark
    ? "1.5px solid rgba(255,68,0,0.2)"
    : "1.5px solid rgba(224,62,0,0.15)";

  return (
    <div
      style={{
        width: 390 * scale,
        height: 844 * scale,
        background: bg,
        borderRadius: 32 * scale,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 260 * scale,
          height: 260 * scale,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18 * scale,
          padding: `0 ${30 * scale}px`,
          maxWidth: 350 * scale,
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontSize: 18 * scale,
            fontWeight: 800,
            color: textColor,
            letterSpacing: "-0.02em",
            fontFamily: isDark ? "'Syne', sans-serif" : "'Playfair Display', Georgia, serif",
          }}
        >
          GodText{" "}
          <span style={{ color: accent }}>AI</span>
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 9 * scale,
            fontWeight: 700,
            color: mutedColor,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            fontFamily: isDark ? "'DM Sans', sans-serif" : "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Send this
        </div>

        {/* Reply card */}
        <div
          style={{
            width: "100%",
            borderRadius: 10 * scale,
            padding: `${18 * scale}px ${20 * scale}px`,
            background: cardBg,
            border: cardBorder,
          }}
        >
          <p
            style={{
              fontSize: 16 * scale,
              fontWeight: 700,
              color: textColor,
              lineHeight: 1.35,
              margin: 0,
              textAlign: "center" as const,
              fontFamily: isDark ? "'DM Sans', sans-serif" : "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {text}
          </p>
        </div>

        {/* Send button */}
        <div
          style={{
            padding: `${7 * scale}px ${24 * scale}px`,
            borderRadius: 8 * scale,
            background: accent,
            color: "#fff",
            fontSize: 10 * scale,
            fontWeight: 700,
            letterSpacing: "0.02em",
            fontFamily: isDark ? "'DM Sans', sans-serif" : "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Send it
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video Rebranding — bulk TikTok video rebranding pipeline
// ---------------------------------------------------------------------------

type RebrandResult = {
  originalUrl: string;
  status: "success" | "no_competitor_frame" | "error";
  outputUrl?: string;
  frameRange?: { start: number; end: number };
  error?: string;
};

function VideoRebrandSection() {
  const [urls, setUrls] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RebrandResult[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  const runRebrand = async () => {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlList.length === 0) return;

    setProcessing(true);
    setError(null);
    setResults([]);
    setProgress(
      `Processing ${urlList.length} video${urlList.length > 1 ? "s" : ""}… This takes 1-3 minutes per video.`,
    );

    try {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const apiUrl = isLocal
        ? "/api/godtext/videos/rebrand"
        : "http://localhost:3000/api/godtext/videos/rebrand";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
        signal: AbortSignal.timeout(600000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setResults(data.results || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError(
          "Can't reach your Mac. Make sure it's on and the Command Center Server is running.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const urlCount = urls
    .split("\n")
    .filter((u) => u.trim().length > 0).length;

  return (
    <section className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-cyan-50/40 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">
            Video Rebranding
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Paste TikTok URLs to download without watermark, detect competitor
            app frames (Plug AI etc.), and replace them with GodText AI
            branding. Up to 10 videos per batch.
          </p>
        </div>
      </div>

      <div className="mb-3">
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          disabled={processing}
          placeholder={
            "Paste TikTok URLs here — one per line\n\nhttps://www.tiktok.com/@user/video/123...\nhttps://www.tiktok.com/@user/video/456..."
          }
          rows={5}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-400 disabled:opacity-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-zinc-400">
            {urlCount > 0
              ? `${urlCount} URL${urlCount > 1 ? "s" : ""} ready`
              : "No URLs pasted yet"}
          </span>
          <button
            onClick={runRebrand}
            disabled={processing || urlCount === 0}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold px-5 py-2 rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            {processing
              ? "Processing…"
              : `Rebrand ${urlCount > 0 ? urlCount : ""} Video${urlCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      {progress && (
        <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
          {progress}
        </div>
      )}

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`text-xs rounded-lg border px-3 py-2.5 ${
                r.status === "success"
                  ? "bg-green-50 border-green-200"
                  : r.status === "no_competitor_frame"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-700 truncate">
                    {r.originalUrl}
                  </div>
                  {r.status === "success" && r.frameRange && (
                    <div className="text-green-700 mt-1">
                      Competitor frame replaced at{" "}
                      {r.frameRange.start.toFixed(1)}s —{" "}
                      {r.frameRange.end.toFixed(1)}s
                    </div>
                  )}
                  {r.status === "no_competitor_frame" && (
                    <div className="text-amber-700 mt-1">
                      No competitor app frame detected — video downloaded but
                      not modified
                    </div>
                  )}
                  {r.status === "error" && (
                    <div className="text-red-600 mt-1">{r.error}</div>
                  )}
                </div>
                {r.status === "success" && r.outputUrl && (
                  <a
                    href={r.outputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="shrink-0 bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}

          <div className="text-[11px] text-zinc-400 pt-1">
            {results.filter((r) => r.status === "success").length} rebranded
            {results.filter((r) => r.status === "no_competitor_frame").length >
              0 &&
              ` · ${results.filter((r) => r.status === "no_competitor_frame").length} no competitor frame`}
            {results.filter((r) => r.status === "error").length > 0 &&
              ` · ${results.filter((r) => r.status === "error").length} failed`}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Upload & Schedule Video — drop a finished video, upload to blob, schedule
// ---------------------------------------------------------------------------

function VideoUploadSection({
  bookedSlots,
  fetchBookedSlots,
}: {
  bookedSlots: Record<string, boolean>;
  fetchBookedSlots: () => Promise<void>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<{
    postId: string;
    status: string;
    scheduledFor: string;
  } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [scheduleSlot, setScheduleSlot] = useState("07:00");

  const handleFile = (f: File) => {
    if (!f.type.startsWith("video/")) return;
    setFile(f);
    setVideoUrl(null);
    setScheduleResult(null);
    setUploadError(null);
    setScheduleError(null);
    uploadFile(f);
  };

  const uploadFile = async (f: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(`godtext-uploads/${Date.now()}-${f.name}`, f, {
        access: "public",
        handleUploadUrl: "/api/godtext/blob/upload",
      });
      setVideoUrl(blob.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const runSchedule = async () => {
    if (!videoUrl) return;
    setScheduling(true);
    setScheduleError(null);
    setScheduleResult(null);
    try {
      const scheduledFor = `${scheduleDate}T${scheduleSlot}:00`;
      const res = await fetch("/api/godtext/post-everywhere/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, scheduledFor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setScheduleResult({
        postId: data.postId,
        status: data.status,
        scheduledFor: `${scheduleDate} at ${SLOT_LABEL_MAP[scheduleSlot] || scheduleSlot}`,
      });
      fetchBookedSlots();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : String(err));
    } finally {
      setScheduling(false);
    }
  };

  const reset = () => {
    setFile(null);
    setVideoUrl(null);
    setUploadError(null);
    setScheduleError(null);
    setScheduleResult(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <section className="mb-6 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">
            Upload & Schedule Video
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Drop any finished video to upload and schedule it to TikTok,
            Instagram Reels, and YouTube Shorts.
          </p>
        </div>
        {file && !uploading && (
          <button
            onClick={reset}
            className="text-xs text-zinc-400 hover:text-red-500 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {!file ? (
        <div
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`rounded-xl border-2 border-dashed transition-colors ${
            isDragging
              ? "border-emerald-400 bg-emerald-50"
              : "border-zinc-300 bg-white/60"
          }`}
        >
          <label className="flex flex-col items-center justify-center py-8 cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-8 w-8 mb-2 ${isDragging ? "text-emerald-400" : "text-zinc-300"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-xs font-medium text-zinc-500">
              {isDragging ? "Drop video here" : "Drag & drop a video or click to browse"}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">MP4, MOV, WebM</p>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div>
          {/* File info */}
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-emerald-100 text-emerald-600">
              VID
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-900 font-medium truncate">
                {file.name}
              </p>
              <p className="text-[11px] text-zinc-400">
                {formatSize(file.size)}
              </p>
            </div>
            {uploading && (
              <span className="text-[11px] text-blue-600 font-medium">
                Uploading…
              </span>
            )}
            {videoUrl && (
              <span className="text-[11px] text-green-600 font-medium">
                Uploaded
              </span>
            )}
          </div>

          {uploadError && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              Upload failed: {uploadError}
            </div>
          )}

          {/* Schedule controls */}
          {videoUrl && !scheduleResult && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={scheduleDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setScheduleDate(newDate);
                  const firstOpen = SLOT_VALUES.find(
                    (s) => !bookedSlots[`${newDate}|${s}`],
                  );
                  if (firstOpen) setScheduleSlot(firstOpen);
                }}
                disabled={scheduling}
                className="rounded border border-emerald-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
              >
                {Array.from({ length: 14 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const val = d.toISOString().split("T")[0];
                  const label = d.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const slotsTotal = SLOT_VALUES.length;
                  const slotsBooked = SLOT_VALUES.filter(
                    (s) => bookedSlots[`${val}|${s}`],
                  ).length;
                  const slotsOpen = slotsTotal - slotsBooked;
                  return (
                    <option key={val} value={val}>
                      {label}
                      {slotsBooked > 0
                        ? ` (${slotsOpen}/${slotsTotal} open)`
                        : ""}
                    </option>
                  );
                })}
              </select>
              <select
                value={scheduleSlot}
                onChange={(e) => setScheduleSlot(e.target.value)}
                disabled={scheduling}
                className="rounded border border-emerald-300 bg-white text-xs px-2 py-1.5 disabled:opacity-40"
              >
                {TIME_SLOTS.map((slot) => {
                  const isBooked =
                    bookedSlots[`${scheduleDate}|${slot.value}`];
                  return (
                    <option
                      key={slot.value}
                      value={slot.value}
                      disabled={isBooked}
                    >
                      {slot.label}
                      {isBooked ? " ✓ BOOKED" : ""}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={runSchedule}
                disabled={scheduling}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
              >
                {scheduling ? "Scheduling…" : "Schedule to Socials"}
              </button>
            </div>
          )}

          {scheduleError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              {scheduleError}
            </div>
          )}

          {scheduleResult && (
            <div className="mt-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
              Scheduled! Post ID:{" "}
              <code className="bg-emerald-100 px-1 rounded">
                {scheduleResult.postId}
              </code>{" "}
              — {scheduleResult.scheduledFor} (ET) to TikTok, Instagram Reels,
              YouTube Shorts
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Scheduled Posts Feed — shows upcoming + published posts from PE
// ---------------------------------------------------------------------------

type PEPost = {
  id: string;
  content: string;
  status: string;
  scheduled_for?: string;
  published_at?: string;
  platform_content?: Record<string, unknown>;
};

function ScheduledPostsFeed() {
  const [posts, setPosts] = useState<PEPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"scheduled" | "published">("scheduled");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/godtext/post-everywhere/posts?status=${tab}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.posts) ? data.posts : [];
        setPosts(list);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <section className="mb-6 rounded-xl border border-purple-200 bg-purple-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Content Calendar</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Scheduled and published GodText AI videos across TikTok, Instagram, YouTube.
          </p>
        </div>
        <div className="flex gap-1">
          {(["scheduled", "published"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                tab === t
                  ? "bg-purple-600 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {t === "scheduled" ? "Scheduled" : "Published"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-zinc-400">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-xs text-zinc-400">
          {tab === "scheduled"
            ? "No scheduled posts. Build a video and schedule it above!"
            : "No published posts yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs"
            >
              <div className="shrink-0 w-14 text-center">
                {post.scheduled_for || post.published_at ? (
                  <div className="text-[10px] font-semibold text-purple-700">
                    {new Date(
                      post.scheduled_for || post.published_at || "",
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                    <br />
                    {new Date(
                      post.scheduled_for || post.published_at || "",
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })}
                  </div>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </div>
              <div className="flex-1 min-w-0 truncate text-zinc-700">
                {post.content.split("\n")[0]}
              </div>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                  post.status === "scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : post.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {post.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
