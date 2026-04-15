"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface YouTubeStatus {
  connected: boolean;
  channelName?: string;
  channelThumbnail?: string;
  connectedDate?: string;
}

const COMING_SOON_PLATFORMS = [
  { label: "TikTok", icon: "🎵" },
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
  const [ytStatus, setYtStatus] = useState<YouTubeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/youtube/status");
      const data = await res.json();
      setYtStatus(data);
    } catch {
      setYtStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/youtube";
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect YouTube? You'll need to re-authorize to post videos.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/auth/youtube/disconnect", { method: "POST" });
      setYtStatus({ connected: false });
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
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
      {connectedParam === "youtube" && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <span className="text-base">✓</span>
          <span>YouTube connected successfully!</span>
        </div>
      )}
      {errorParam && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <span className="text-base">⚠</span>
          <span>Connection failed: {errorParam}</span>
        </div>
      )}

      {/* Platform cards */}
      <div className="space-y-4">
        {/* YouTube — full OAuth integration */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900">YouTube</h3>
                {loading ? (
                  <p className="text-sm text-zinc-400">Checking connection...</p>
                ) : ytStatus?.connected ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-green-700 font-medium">Connected</span>
                    <span className="text-sm text-zinc-400">—</span>
                    <span className="text-sm text-zinc-600">{ytStatus.channelName}</span>
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
              ) : ytStatus?.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Connect YouTube
                </button>
              )}
            </div>
          </div>

          {/* Channel details when connected */}
          {ytStatus?.connected && (
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center gap-4">
              {ytStatus.channelThumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ytStatus.channelThumbnail}
                  alt={ytStatus.channelName || "Channel"}
                  className="w-10 h-10 rounded-full border border-zinc-200"
                />
              )}
              <div className="text-sm">
                <p className="text-zinc-700 font-medium">{ytStatus.channelName}</p>
                <p className="text-zinc-400 text-xs">
                  Connected {ytStatus.connectedDate || "recently"}
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  Ready to publish
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Other platforms — Coming Soon */}
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
              <button
                disabled
                className="px-4 py-2 bg-zinc-100 text-zinc-400 text-sm font-medium rounded-lg cursor-not-allowed"
              >
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
