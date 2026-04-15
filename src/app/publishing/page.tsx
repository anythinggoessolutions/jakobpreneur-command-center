"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface PlatformStatus {
  connected: boolean;
  name?: string;
  thumbnail?: string;
  connectedDate?: string;
}

const COMING_SOON_PLATFORMS = [
  { label: "Instagram", icon: "📸" },
  { label: "X / Twitter", icon: "𝕏" },
];

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
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [ytRes, ttRes] = await Promise.all([
        fetch("/api/auth/youtube/status"),
        fetch("/api/auth/tiktok/status"),
      ]);
      const ytData = await ytRes.json();
      const ttData = await ttRes.json();
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
    } catch {
      setYtStatus({ connected: false });
      setTtStatus({ connected: false });
    } finally {
      setLoading(false);
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
