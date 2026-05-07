"use client";

import { useEffect, useState } from "react";

interface PlatformStats {
  platform: string;
  connected: boolean;
  username: string;
  followers: number | null;
  posts: number | null;
  views: number | null;
  subscribers: number | null;
  watchHours: number | null;
  impressions: number | null;
  engagement: string | null;
  error?: string;
}

interface ScheduledVideo {
  toolName: string;
  partNumber: number;
  status: string;
  scheduledDate: string;
  platforms: string[];
}

const PLATFORM_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  YouTube: { icon: "▶️", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  Instagram: { icon: "📸", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  TikTok: { icon: "🎵", color: "text-pink-700", bg: "bg-pink-50 border-pink-200" },
  X: { icon: "𝕏", color: "text-zinc-700", bg: "bg-zinc-100 border-zinc-300" },
};

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function AnalyticsPage() {
  const [platforms, setPlatforms] = useState<PlatformStats[]>([]);
  const [videos, setVideos] = useState<ScheduledVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, scheduleRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/schedule"),
      ]);
      const analyticsData = await analyticsRes.json();
      const scheduleData = await scheduleRes.json();
      if (analyticsData.platforms) setPlatforms(analyticsData.platforms);
      if (scheduleData.videos) setVideos(scheduleData.videos);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Aggregate stats
  const totalFollowers = platforms.reduce((sum, p) => sum + (p.followers || p.subscribers || 0), 0);
  const totalViews = platforms.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalPosts = platforms.reduce((sum, p) => sum + (p.posts || 0), 0);
  const totalScheduled = videos.filter((v) => v.status === "scheduled").length;
  const totalPosted = videos.filter((v) => v.status === "posted").length;

  // Group videos by date
  const videosByDate = videos.reduce((acc, v) => {
    const date = v.scheduledDate || "unscheduled";
    if (!acc[date]) acc[date] = [];
    acc[date].push(v);
    return acc;
  }, {} as Record<string, ScheduledVideo[]>);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">Live stats from your connected platforms.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard label="Total Followers" value={formatNumber(totalFollowers)} accent="green" />
        <MetricCard label="Total Views" value={formatNumber(totalViews)} accent="blue" />
        <MetricCard label="Total Posts" value={formatNumber(totalPosts)} />
        <MetricCard label="Scheduled" value={String(totalScheduled)} accent="purple" />
        <MetricCard label="Published" value={String(totalPosted)} accent="green" />
      </div>

      {/* Platform cards with live data */}
      <h2 className="text-lg font-bold text-zinc-900 mb-4">Platform Breakdown</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 p-5 animate-pulse">
              <div className="h-6 bg-zinc-100 rounded w-24 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-zinc-100 rounded w-full" />
                <div className="h-4 bg-zinc-100 rounded w-3/4" />
                <div className="h-4 bg-zinc-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {/* Show connected platforms with real data */}
          {platforms.map((p) => {
            const config = PLATFORM_CONFIG[p.platform] || PLATFORM_CONFIG.X;
            return (
              <div key={p.platform} className={`rounded-xl border p-5 ${config.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{config.icon}</span>
                  <span className={`font-semibold ${config.color}`}>{p.platform}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-4">{p.username}</p>

                {p.error ? (
                  <div className="text-xs text-red-500 bg-red-50 rounded-lg p-2 border border-red-200">
                    {p.error.slice(0, 80)}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {p.platform === "YouTube" ? (
                      <>
                        <StatRow label="Subscribers" value={formatNumber(p.subscribers)} />
                        <StatRow label="Total Views" value={formatNumber(p.views)} />
                        <StatRow label="Videos" value={formatNumber(p.posts)} />
                      </>
                    ) : p.platform === "Instagram" ? (
                      <>
                        <StatRow label="Followers" value={formatNumber(p.followers)} />
                        <StatRow label="Posts" value={formatNumber(p.posts)} />
                      </>
                    ) : p.platform === "X" ? (
                      <>
                        <StatRow label="Followers" value={formatNumber(p.followers)} />
                        <StatRow label="Tweets" value={formatNumber(p.posts)} />
                      </>
                    ) : p.platform === "TikTok" ? (
                      <>
                        <StatRow label="Followers" value={formatNumber(p.followers)} />
                        <StatRow label="Total Likes" value={formatNumber(p.views)} />
                        <StatRow label="Videos" value={formatNumber(p.posts)} />
                      </>
                    ) : (
                      <>
                        <StatRow label="Followers" value={formatNumber(p.followers)} />
                        <StatRow label="Posts" value={formatNumber(p.posts)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show disconnected platforms */}
          {Object.entries(PLATFORM_CONFIG)
            .filter(([key]) => !platforms.find((p) => p.platform === key))
            .map(([key, config]) => (
              <div key={key} className="rounded-xl border border-zinc-200 border-dashed p-5 bg-zinc-50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl opacity-40">{config.icon}</span>
                  <span className="font-semibold text-zinc-400">{key}</span>
                </div>
                <p className="text-xs text-zinc-400">Not connected</p>
                <p className="text-xs text-zinc-300 mt-1">Connect in Publishing tab</p>
              </div>
            ))}
        </div>
      )}

      {/* AI Performance Analysis */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">AI Performance Analysis</h2>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          {totalPosted >= 10 ? (
            <div className="text-sm text-zinc-700 leading-relaxed">
              <p className="font-semibold text-green-700 mb-2">Analysis ready</p>
              <p>Claude will analyze your top-performing videos and provide recommendations here.</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🧠</div>
              <p className="text-zinc-500 text-sm">
                AI analysis activates after <strong>10 published videos</strong>.
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                {totalPosted}/10 — {Math.max(0, 10 - totalPosted)} more to go
              </p>
              <div className="w-48 mx-auto h-1.5 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(100, (totalPosted / 10) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Runway — how far ahead content is scheduled */}
      {(() => {
        // Count only items with a future or today scheduled date.
        // America/New_York local day boundary, matches the scheduler's timezone.
        const todayEst = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()); // YYYY-MM-DD in EDT
        const upcoming = videos.filter(
          (v) =>
            (v.status === "scheduled" || v.status === "partial") &&
            v.scheduledDate >= todayEst,
        );
        if (upcoming.length === 0) return null;
        const latestDate = upcoming
          .map((v) => v.scheduledDate)
          .sort()
          .at(-1)!;
        // Days diff in EDT calendar days.
        const daysAhead = Math.round(
          (Date.parse(latestDate + "T12:00:00-04:00") -
            Date.parse(todayEst + "T12:00:00-04:00")) /
            (1000 * 60 * 60 * 24),
        );
        const distinctDays = new Set(upcoming.map((v) => v.scheduledDate)).size;
        const latestLabel = new Date(latestDate + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const ahead =
          daysAhead === 0
            ? "Today only"
            : daysAhead === 1
              ? "1 day ahead"
              : `${daysAhead} days ahead`;
        return (
          <div className="mb-6 bg-white rounded-xl border border-zinc-200 p-5 flex items-center gap-6">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Runway</div>
              <div className="mt-1 text-2xl font-bold text-zinc-900">{ahead}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {upcoming.length} scheduled · {distinctDays} day{distinctDays === 1 ? "" : "s"} · through {latestLabel}
              </div>
            </div>
            <div className="hidden sm:flex flex-1 gap-1 overflow-hidden justify-end">
              {/* Compact dot strip: one column per day, one dot per slot. Full = 3 */}
              {(() => {
                const byDay: Record<string, number> = {};
                for (const v of upcoming) byDay[v.scheduledDate] = (byDay[v.scheduledDate] || 0) + 1;
                const sortedDays = Object.keys(byDay).sort();
                return sortedDays.slice(0, 14).map((d) => {
                  const n = byDay[d];
                  return (
                    <div key={d} className="flex flex-col items-center gap-0.5" title={`${d}: ${n}/3 slots`}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${i < n ? "bg-zinc-900" : "bg-zinc-200"}`}
                        />
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        );
      })()}

      {/* Content Timeline */}
      <h2 className="text-lg font-bold text-zinc-900 mb-4">Content Timeline</h2>
      {videos.length === 0 ? (
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-8 text-center">
          <p className="text-zinc-400 text-sm">No videos yet. Record your first from the Content tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(videosByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vids]) => {
              const dateObj = new Date(date + "T12:00:00");
              const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
              return (
                <div key={date} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
                    <span className="text-sm font-semibold text-zinc-700">{dateLabel}</span>
                    <span className="text-xs text-zinc-400 ml-2">{vids.length} video{vids.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {vids.map((v, i) => {
                      const statusColors: Record<string, string> = {
                        scheduled: "bg-blue-100 text-blue-700",
                        posted: "bg-green-100 text-green-700",
                        failed: "bg-red-100 text-red-700",
                      };
                      return (
                        <div key={i} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-sm font-medium text-zinc-900 flex-1">{v.toolName}</span>
                          {v.partNumber > 0 && <span className="text-xs text-zinc-400">Pt. {v.partNumber}</span>}
                          <div className="flex gap-1">
                            {(v.platforms || []).map((p) => (
                              <span key={p} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{p}</span>
                            ))}
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColors[v.status] || "bg-zinc-100 text-zinc-600"}`}>
                            {v.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Growth placeholders */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Monthly Growth</h3>
          <div className="text-center py-6">
            <p className="text-zinc-400 text-sm">Growth charts appear after 30 days of data.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Hook Type Performance</h3>
          <div className="text-center py-6">
            <p className="text-zinc-400 text-sm">Which hook types perform best?</p>
            <p className="text-zinc-300 text-xs mt-1">A (Curiosity) vs B (Series) vs C (Bold Claim)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colors: Record<string, string> = { blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600" };
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? colors[accent] || "text-zinc-900" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
