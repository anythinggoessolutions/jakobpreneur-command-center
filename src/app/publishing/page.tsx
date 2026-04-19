"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface PlatformStatus {
  connected: boolean;
  name?: string;
  thumbnail?: string;
  connectedDate?: string;
}

const COMING_SOON_PLATFORMS: { label: string; icon: string }[] = [];

export default function PublishingPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-8 text-zinc-400">Loading...</div>}>
      <PublishingContent />
    </Suspense>
  );
}

function PublishingContent() {
  const [ytStatus, setYtStatus] = useState<PlatformStatus | null>(null);
  const [ttStatus, setTtStatus] = useState<PlatformStatus | null>(null);
  const [igStatus, setIgStatus] = useState<PlatformStatus | null>(null);
  const [xStatus, setXStatus] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [scheduledVideos, setScheduledVideos] = useState<{
    id: string;
    toolName: string;
    partNumber: number;
    status: string;
    scheduledDate: string;
    scheduledTime: string;
    platforms: string[];
    postedUrl: string;
    error: string;
    themeTag: string;
  }[]>([]);
  const [tweets, setTweets] = useState<{
    scheduled: { id: string; text: string; scheduledTime: string; type: string }[];
    posted: { id: string; text: string; postedAt: string; tweetUrl: string }[];
    failed: { id: string; text: string; error: string; scheduledTime: string }[];
  }>({ scheduled: [], posted: [], failed: [] });
  const [firing, setFiring] = useState(false);
  const [fireResult, setFireResult] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    loadStatus();
    loadSchedule();
    loadTweets();
    // Clear URL params after 3 seconds so error/success banners don't persist on refresh
    if (connectedParam || errorParam) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, "", "/publishing");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectedParam, errorParam]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [ytRes, ttRes, igRes, xRes] = await Promise.all([
        fetch("/api/auth/youtube/status"),
        fetch("/api/auth/tiktok/status"),
        fetch("/api/auth/instagram/status"),
        fetch("/api/auth/twitter/status"),
      ]);
      const ytData = await ytRes.json();
      const ttData = await ttRes.json();
      const igData = await igRes.json();
      const xData = await xRes.json();
      setYtStatus({
        connected: ytData.connected,
        name: ytData.channelName,
        thumbnail: ytData.channelThumbnail,
        connectedDate: ytData.connectedDate,
      });
      setTtStatus({
        connected: ttData.connected,
        name: ttData.displayName,
        thumbnail: ttData.avatarUrl,
        connectedDate: ttData.connectedDate,
      });
      setIgStatus({
        connected: igData.connected,
        name: igData.username,
        thumbnail: igData.profilePicture,
        connectedDate: igData.connectedDate,
      });
      setXStatus({
        connected: xData.connected,
        name: xData.username,
        thumbnail: xData.profileImage,
        connectedDate: xData.connectedDate,
      });
    } catch {
      setYtStatus({ connected: false });
      setTtStatus({ connected: false });
      setIgStatus({ connected: false });
      setXStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      const data = await res.json();
      if (data.videos) setScheduledVideos(data.videos);
    } catch {
      // ignore
    }
  };

  const loadTweets = async () => {
    try {
      const res = await fetch("/api/tweets/list", { cache: "no-store" });
      const data = await res.json();
      setTweets({
        scheduled: data.scheduled || [],
        posted: data.posted || [],
        failed: data.failed || [],
      });
    } catch {
      // ignore
    }
  };

  const handleFireNow = async () => {
    if (firing) return;
    setFiring(true);
    setFireResult(null);
    try {
      const res = await fetch("/api/cron/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFireResult(data.error || `HTTP ${res.status}`);
      } else {
        const v = data.videos || { fired: 0, failed: 0, skipped: 0 };
        const c = data.carousels || { fired: 0, failed: 0, skipped: 0 };
        const t = data.tweets || { fired: 0, failed: 0, skipped: 0 };
        setFireResult(
          `fired — videos: ${v.fired}/${v.fired + v.failed + v.skipped}, carousels: ${c.fired}/${c.fired + c.failed + c.skipped}, tweets: ${t.fired}/${t.fired + t.failed + t.skipped}`,
        );
      }
      // Refresh both lists so UI reflects the cron results
      await Promise.all([loadSchedule(), loadTweets()]);
    } catch (err) {
      setFireResult(err instanceof Error ? err.message : String(err));
    } finally {
      setFiring(false);
    }
  };

  const handleRetry = async (id: string) => {
    if (retryingId) return;
    setRetryingId(id);
    try {
      const res = await fetch(`/api/videos/${id}/retry`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert("Retry failed: " + (data.error || res.status));
      }
      await loadSchedule();
    } finally {
      setRetryingId(null);
    }
  };

  const handleConnect = (platform: string) => {
    window.location.href = `/api/auth/${platform}`;
  };

  const handleDisconnect = async (platform: string) => {
    const label = platform === "youtube" ? "YouTube" : "TikTok";
    if (!confirm(`Disconnect ${label}? You'll need to re-authorize to post.`)) return;
    setDisconnecting(platform);
    try {
      await fetch(`/api/auth/${platform}/disconnect`, { method: "POST" });
      if (platform === "youtube") setYtStatus({ connected: false });
      if (platform === "tiktok") setTtStatus({ connected: false });
      if (platform === "instagram") setIgStatus({ connected: false });
      if (platform === "twitter") setXStatus({ connected: false });
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Publishing</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Connect your accounts to publish content directly from the Command Center.
        </p>
      </div>

      {/* Success / Error banners */}
      {connectedParam && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <span className="text-base">✓</span>
          <span>{connectedParam === "youtube" ? "YouTube" : "TikTok"} connected successfully!</span>
        </div>
      )}
      {errorParam && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <span className="text-base">⚠</span>
          <span>Connection failed: {errorParam}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* YouTube */}
        <PlatformCard
          label="YouTube"
          icon={
            <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          }
          iconBg="bg-red-50 border-red-100"
          buttonColor="bg-red-600 hover:bg-red-700"
          status={ytStatus}
          loading={loading}
          disconnecting={disconnecting === "youtube"}
          onConnect={() => handleConnect("youtube")}
          onDisconnect={() => handleDisconnect("youtube")}
        />

        {/* TikTok */}
        <PlatformCard
          label="TikTok"
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
            </svg>
          }
          iconBg="bg-zinc-900 border-zinc-800"
          iconTextColor="text-white"
          buttonColor="bg-zinc-900 hover:bg-zinc-800"
          status={ttStatus}
          loading={loading}
          disconnecting={disconnecting === "tiktok"}
          onConnect={() => handleConnect("tiktok")}
          onDisconnect={() => handleDisconnect("tiktok")}
        />

        {/* Instagram */}
        <PlatformCard
          label="Instagram"
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="url(#ig-gradient)">
              <defs>
                <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#feda75" />
                  <stop offset="25%" stopColor="#fa7e1e" />
                  <stop offset="50%" stopColor="#d62976" />
                  <stop offset="75%" stopColor="#962fbf" />
                  <stop offset="100%" stopColor="#4f5bd5" />
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          }
          iconBg="bg-pink-50 border-pink-100"
          buttonColor="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          status={igStatus}
          loading={loading}
          disconnecting={disconnecting === "instagram"}
          onConnect={() => handleConnect("instagram")}
          onDisconnect={() => handleDisconnect("instagram")}
        />

        {/* X / Twitter */}
        <PlatformCard
          label="X"
          icon={<span className="text-xl font-bold">𝕏</span>}
          iconBg="bg-zinc-900 border-zinc-800"
          iconTextColor="text-white"
          buttonColor="bg-zinc-900 hover:bg-zinc-800"
          status={xStatus}
          loading={loading}
          disconnecting={disconnecting === "twitter"}
          onConnect={() => handleConnect("twitter")}
          onDisconnect={() => handleDisconnect("twitter")}
        />

        {/* Coming Soon platforms */}
        {COMING_SOON_PLATFORMS.map((p) => (
          <div key={p.label} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-2xl">
                  {p.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">{p.label}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-300" />
                    <span className="text-sm text-zinc-400">Not connected</span>
                  </div>
                </div>
              </div>
              <button disabled className="px-4 py-2 bg-zinc-100 text-zinc-400 text-sm font-medium rounded-lg cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Scheduled Queue */}
      <div className="mt-10">
        <div className="flex items-start justify-between mb-1 gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Publishing Queue</h2>
            <p className="text-sm text-zinc-500">
              Videos auto-schedule to the next available slot (9am, 1pm, or 7pm EDT, max 3/day).
            </p>
          </div>
          <button
            onClick={handleFireNow}
            disabled={firing}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 text-zinc-700 cursor-pointer"
            title="Manually trigger the fire-due cron for anything overdue"
          >
            {firing ? "Firing…" : "Fire due now"}
          </button>
        </div>
        {fireResult && (
          <p className="text-xs text-zinc-500 mb-3 mt-1">{fireResult}</p>
        )}
        <div className="mb-4" />

        {scheduledVideos.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-zinc-400 text-sm">No videos scheduled yet. Record a video from the Content tab and hit Schedule.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduledVideos.map((v, i) => {
              const dateObj = v.scheduledTime
                ? new Date(v.scheduledTime)
                : v.scheduledDate
                  ? new Date(v.scheduledDate + "T12:00:00")
                  : null;
              const dateLabel = dateObj
                ? dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                : "Unscheduled";
              const timeLabel = v.scheduledTime && dateObj
                ? dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " EDT"
                : null;
              const statusColors: Record<string, string> = {
                scheduled: "bg-blue-100 text-blue-700",
                posted: "bg-green-100 text-green-700",
                failed: "bg-red-100 text-red-700",
                partial: "bg-orange-100 text-orange-700",
                recorded: "bg-amber-100 text-amber-700",
              };
              const isRetryable = v.status === "failed" || v.status === "partial";
              const isCarousel = v.themeTag === "carousel";
              const displayName = v.toolName.replace(/^\[Carousel\]\s*/, "");
              return (
                <div key={v.id} className="bg-white rounded-lg border border-zinc-200 px-4 py-3">
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-300 font-mono text-sm w-6 text-center shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isCarousel && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                            Carousel
                          </span>
                        )}
                        <span className="text-sm font-semibold text-zinc-900">{displayName}</span>
                        {v.partNumber > 0 && <span className="text-xs text-zinc-400">Pt. {v.partNumber}</span>}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {dateLabel}{timeLabel ? `, ${timeLabel}` : ""} &middot; {(v.platforms || []).join(", ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {v.postedUrl && (
                        <a
                          href={v.postedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 underline"
                        >
                          View post →
                        </a>
                      )}
                      {isRetryable && (
                        <button
                          onClick={() => handleRetry(v.id)}
                          disabled={retryingId === v.id}
                          className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 text-zinc-700 cursor-pointer"
                        >
                          {retryingId === v.id ? "…" : "Retry"}
                        </button>
                      )}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[v.status] || "bg-zinc-100 text-zinc-600"}`}>
                        {v.status}
                      </span>
                    </div>
                  </div>
                  {v.error && (v.status === "failed" || v.status === "partial") && (
                    <div className="mt-2 ml-10 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 font-mono break-all">
                      {v.error.slice(0, 300)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tweets */}
      <div className="mt-10">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Tweets</h2>
            <p className="text-sm text-zinc-500">
              {tweets.scheduled.length} upcoming &middot; {tweets.posted.length} recent
              {tweets.failed.length > 0 && ` · ${tweets.failed.length} failed`}
            </p>
          </div>
        </div>

        {tweets.scheduled.length === 0 && tweets.posted.length === 0 && tweets.failed.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-zinc-400 text-sm">No tweets scheduled yet. Publish a video to auto-queue 5 tweets across the day.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tweets.failed.map((t) => (
              <TweetRow
                key={t.id}
                text={t.text}
                when={t.scheduledTime}
                whenLabel="scheduled"
                status="failed"
                extra={t.error}
              />
            ))}
            {tweets.scheduled.map((t) => (
              <TweetRow
                key={t.id}
                text={t.text}
                when={t.scheduledTime}
                whenLabel="scheduled"
                status="scheduled"
                extra={t.type}
              />
            ))}
            {tweets.posted.map((t) => (
              <TweetRow
                key={t.id}
                text={t.text}
                when={t.postedAt}
                whenLabel="posted"
                status="posted"
                url={t.tweetUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Setup info */}
      <div className="mt-8 p-5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">How Publishing Works</h3>
        <div className="space-y-2 text-sm text-zinc-600">
          <p>1. <strong>Connect</strong> your platform accounts above</p>
          <p>2. <strong>Drop</strong> a recording in the Content tab and hit <strong>Schedule</strong></p>
          <p>3. The Mac pipeline processes the video, uploads the MP4 to Vercel Blob, and schedules it to the next open 9am / 1pm / 7pm EDT slot</p>
          <p>4. Tweets (5/day across 9am / 12pm / 3pm / 6pm / 9pm EDT) and a carousel slot are scheduled at the same time</p>
          <p>5. A <strong>Vercel cron</strong> fires every 5 minutes — when a video, tweet, or carousel hits its slot, it posts automatically</p>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({
  label, icon, iconBg, iconTextColor, buttonColor, status, loading, disconnecting, onConnect, onDisconnect,
}: {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconTextColor?: string;
  buttonColor: string;
  status: PlatformStatus | null;
  loading: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${iconBg} ${iconTextColor || ""}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{label}</h3>
            {loading ? (
              <p className="text-sm text-zinc-400">Checking connection...</p>
            ) : status?.connected ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-700 font-medium">Connected</span>
                {status.name && (
                  <>
                    <span className="text-sm text-zinc-400">—</span>
                    <span className="text-sm text-zinc-600">{status.name}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-300" />
                <span className="text-sm text-zinc-500">Not connected</span>
              </div>
            )}
          </div>
        </div>
        <div>
          {loading ? (
            <div className="w-28 h-9 bg-zinc-100 animate-pulse rounded-lg" />
          ) : status?.connected ? (
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={onConnect}
              className={`px-4 py-2 ${buttonColor} text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer`}
            >
              Connect {label}
            </button>
          )}
        </div>
      </div>

      {status?.connected && (
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center gap-4">
          {status.thumbnail && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={status.thumbnail} alt={status.name || label} className="w-10 h-10 rounded-full border border-zinc-200" />
          )}
          <div className="text-sm">
            <p className="text-zinc-700 font-medium">{status.name}</p>
            <p className="text-zinc-400 text-xs">Connected {status.connectedDate || "recently"}</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Ready to publish</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TweetRow({ text, when, whenLabel, status, url, extra }: { text: string; when: string; whenLabel: "scheduled" | "posted"; status: "scheduled" | "posted" | "failed"; url?: string; extra?: string }) {
  const d = when ? new Date(when) : null;
  const dateLabel = d
    ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" })
    : "—";
  const timeLabel = d
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " EDT"
    : "";
  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    posted: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <div className="bg-white rounded-lg border border-zinc-200 px-4 py-3">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-800 line-clamp-2 whitespace-pre-wrap">{text}</div>
          <div className="text-xs text-zinc-400 mt-1">
            {whenLabel === "posted" ? "Posted" : "Scheduled"} {dateLabel}{timeLabel ? `, ${timeLabel}` : ""}
            {extra && whenLabel !== "posted" ? ` · ${extra}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 underline">
              View →
            </a>
          )}
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[status]}`}>{status}</span>
        </div>
      </div>
      {status === "failed" && extra && (
        <div className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 font-mono break-all">
          {extra.slice(0, 300)}
        </div>
      )}
    </div>
  );
}
