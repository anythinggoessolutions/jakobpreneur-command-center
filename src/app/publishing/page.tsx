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
  const [scheduledVideos, setScheduledVideos] = useState<{id: string; toolName: string; partNumber: number; status: string; scheduledDate: string; platforms: string[]}[]>([]);
  const searchParams = useSearchParams();

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    loadStatus();
    loadSchedule();
  }, []);

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
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.videos) setScheduledVideos(data.videos);
    } catch {
      // ignore
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
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Publishing Queue</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Videos auto-schedule to the next available slot (9am, 1pm, or 7pm EST, max 3/day).
        </p>

        {scheduledVideos.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-zinc-400 text-sm">No videos scheduled yet. Record a video from the Content tab and hit Complete.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduledVideos.map((v, i) => {
              const dateObj = v.scheduledDate ? new Date(v.scheduledDate + "T12:00:00") : null;
              const dateLabel = dateObj ? dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Unscheduled";
              const statusColors: Record<string, string> = {
                scheduled: "bg-blue-100 text-blue-700",
                posted: "bg-green-100 text-green-700",
                failed: "bg-red-100 text-red-700",
                recorded: "bg-amber-100 text-amber-700",
              };
              return (
                <div key={v.id} className="bg-white rounded-lg border border-zinc-200 px-4 py-3 flex items-center gap-4">
                  <div className="text-zinc-300 font-mono text-sm w-6 text-center shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">{v.toolName}</span>
                      {v.partNumber > 0 && <span className="text-xs text-zinc-400">Pt. {v.partNumber}</span>}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {dateLabel} &middot; {(v.platforms || []).join(", ")}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[v.status] || "bg-zinc-100 text-zinc-600"}`}>
                    {v.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Setup info */}
      <div className="mt-8 p-5 bg-zinc-50 rounded-xl border border-zinc-200">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">How Publishing Works</h3>
        <div className="space-y-2 text-sm text-zinc-600">
          <p>1. <strong>Connect</strong> your platform accounts above</p>
          <p>2. <strong>Record</strong> a video from the Content tab and hit Complete</p>
          <p>3. Videos are <strong>auto-scheduled</strong> to the next available time slot (9am, 1pm, or 7pm EST)</p>
          <p>4. <strong>Make.com</strong> handles the actual posting on schedule</p>
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
