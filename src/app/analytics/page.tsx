"use client";

import { useEffect, useState } from "react";

interface ScheduledVideo {
  toolName: string;
  partNumber: number;
  status: string;
  scheduledDate: string;
  platforms: string[];
}

const PLATFORMS = [
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { key: "instagram", label: "Instagram", icon: "📸", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { key: "youtube", label: "YouTube", icon: "▶️", color: "bg-red-50 border-red-200 text-red-700" },
  { key: "x", label: "X", icon: "𝕏", color: "bg-zinc-100 border-zinc-300 text-zinc-700" },
];

export default function AnalyticsPage() {
  const [videos, setVideos] = useState<ScheduledVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.videos) setVideos(data.videos);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const totalPosted = videos.filter((v) => v.status === "posted").length;
  const totalScheduled = videos.filter((v) => v.status === "scheduled").length;
  const totalRecorded = videos.length;

  // Group by date for timeline
  const videosByDate = videos.reduce((acc, v) => {
    const date = v.scheduledDate || "unscheduled";
    if (!acc[date]) acc[date] = [];
    acc[date].push(v);
    return acc;
  }, {} as Record<string, ScheduledVideo[]>);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track performance across all platforms. Data populates as you post content.
        </p>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Videos" value={String(totalRecorded)} sub="all time" />
        <MetricCard label="Scheduled" value={String(totalScheduled)} sub="upcoming" accent="blue" />
        <MetricCard label="Posted" value={String(totalPosted)} sub="published" accent="green" />
        <MetricCard label="This Week" value={String(getThisWeekCount(videos))} sub="videos" accent="purple" />
      </div>

      {/* Platform breakdown */}
      <h2 className="text-lg font-bold text-zinc-900 mb-4">Platform Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {PLATFORMS.map((p) => (
          <div key={p.key} className={`rounded-xl border p-5 ${p.color}`}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">{p.icon}</span>
              <span className="font-semibold">{p.label}</span>
            </div>
            <div className="space-y-3">
              <PlatformMetric label="Views" value="—" sub="connect analytics" />
              <PlatformMetric label="Followers" value="—" sub="to see data" />
              <PlatformMetric label="Engagement" value="—" sub="" />
              <PlatformMetric label="Top Video" value="—" sub="" />
            </div>
          </div>
        ))}
      </div>

      {/* AI Performance Analysis */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">AI Performance Analysis</h2>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          {totalPosted >= 10 ? (
            <div className="text-sm text-zinc-700 leading-relaxed">
              <p className="font-semibold text-green-700 mb-2">Analysis ready</p>
              <p>Analysis will appear here after Claude reviews your video performance data.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🧠</div>
              <p className="text-zinc-500 text-sm">
                AI analysis activates after <strong>10 published videos</strong>.
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                {totalPosted}/10 videos posted — {10 - totalPosted} more to go
              </p>
              <div className="w-48 mx-auto h-1.5 bg-zinc-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(totalPosted / 10) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Timeline */}
      <h2 className="text-lg font-bold text-zinc-900 mb-4">Content Timeline</h2>
      {loading ? (
        <div className="text-center py-8 text-zinc-400">Loading...</div>
      ) : Object.keys(videosByDate).length === 0 ? (
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-8 text-center">
          <p className="text-zinc-400 text-sm">No videos yet. Record your first video from the Content tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(videosByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vids]) => {
              const dateObj = new Date(date + "T12:00:00");
              const dateLabel = dateObj.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              });
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
                        recorded: "bg-amber-100 text-amber-700",
                      };
                      return (
                        <div key={i} className="px-5 py-3 flex items-center gap-3">
                          <span className="text-sm font-medium text-zinc-900 flex-1">{v.toolName}</span>
                          {v.partNumber > 0 && (
                            <span className="text-xs text-zinc-400">Pt. {v.partNumber}</span>
                          )}
                          <div className="flex gap-1">
                            {(v.platforms || []).map((p) => (
                              <span key={p} className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                                {p}
                              </span>
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

      {/* Growth tracking placeholder */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Monthly Growth</h3>
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm">Growth charts appear after 30 days of data.</p>
            <p className="text-zinc-300 text-xs mt-1">Views, followers, and engagement over time</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Hook Type Performance</h3>
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm">Which hook types perform best?</p>
            <p className="text-zinc-300 text-xs mt-1">A (Curiosity) vs B (Series) vs C (Bold Claim)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
  };
  const valueColor = accent ? colors[accent as keyof typeof colors] : "text-zinc-900";
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5">
      <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
    </div>
  );
}

function PlatformMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium opacity-70">{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold">{value}</span>
        {sub && <span className="text-[10px] opacity-50 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function getThisWeekCount(videos: ScheduledVideo[]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return videos.filter((v) => {
    if (!v.scheduledDate) return false;
    const d = new Date(v.scheduledDate + "T12:00:00");
    return d >= startOfWeek;
  }).length;
}
