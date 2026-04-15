"use client";

import { useEffect, useState, useMemo } from "react";
import AddBackgroundModal from "@/components/AddBackgroundModal";
import FullscreenPlayer from "@/components/FullscreenPlayer";

interface BackgroundVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  videoId: string;
  category: string;
  thumbnailUrl: string;
  duration: string;
  addedDate: string;
  timesUsed: number;
  status: string;
}

const CATEGORIES = ["All", "Cartoons", "Pixel Art", "TV Moments", "ASMR", "Memes", "Animated Shorts", "Nostalgia", "Random"];

const CATEGORY_COLORS: Record<string, string> = {
  Cartoons: "bg-amber-100 text-amber-700",
  "Pixel Art": "bg-green-100 text-green-700",
  "TV Moments": "bg-blue-100 text-blue-700",
  ASMR: "bg-cyan-100 text-cyan-700",
  Memes: "bg-pink-100 text-pink-700",
  "Animated Shorts": "bg-purple-100 text-purple-700",
  Nostalgia: "bg-orange-100 text-orange-700",
  Random: "bg-zinc-100 text-zinc-700",
};

export default function BackgroundsPage() {
  const [videos, setVideos] = useState<BackgroundVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [playing, setPlaying] = useState<BackgroundVideo | null>(null);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backgrounds");
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
      }
    } catch (err) {
      console.error("Failed to load videos", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const filtered = useMemo(() => {
    return filter === "All" ? videos : videos.filter((v) => v.category === filter);
  }, [videos, filter]);

  const playVideo = async (video: BackgroundVideo) => {
    setPlaying(video);
    // Increment times_used in background
    fetch("/api/backgrounds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: video.id,
        action: "increment_used",
        currentTimesUsed: video.timesUsed,
      }),
    }).catch(() => {});
    // Optimistic UI update
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, timesUsed: v.timesUsed + 1 } : v)));
  };

  const playRandom = () => {
    const pool = filter === "All" ? videos : filtered;
    if (pool.length === 0) return;
    // Weight toward less-used videos: pick random from bottom 50% by usage
    const sorted = [...pool].sort((a, b) => a.timesUsed - b.timesUsed);
    const lessUsed = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
    const random = lessUsed[Math.floor(Math.random() * lessUsed.length)];
    playVideo(random);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Backgrounds</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Eye-catching videos to play behind you while recording hooks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Video
          </button>
        </div>
      </div>

      {/* Random button */}
      <button
        onClick={playRandom}
        disabled={videos.length === 0}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold py-5 rounded-xl transition-colors mb-6 flex items-center justify-center gap-3 cursor-pointer text-base shadow-sm hover:shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0-9.984l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183" />
        </svg>
        Pick a Random Background
        <span className="text-xs font-normal opacity-80 ml-2">
          (weighted toward less-used)
        </span>
      </button>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count = cat === "All" ? videos.length : videos.filter((v) => v.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filter === cat
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {cat} <span className={filter === cat ? "text-zinc-400" : "text-zinc-300"}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Video grid */}
      {loading ? (
        <div className="text-center py-20 text-zinc-400">Loading library...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          {filter === "All" ? "No videos yet. Add your first one!" : `No videos in ${filter} yet.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all"
            >
              <div className="relative aspect-video bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                  }}
                />
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-mono px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                )}
                {video.timesUsed > 0 && (
                  <div className="absolute top-2 left-2 bg-zinc-900/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    Used {video.timesUsed}x
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${CATEGORY_COLORS[video.category] || CATEGORY_COLORS.Random}`}>
                    {video.category}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug min-h-[2.5rem]">
                  {video.title}
                </p>
                <button
                  onClick={() => playVideo(video)}
                  className="mt-3 w-full bg-zinc-900 hover:bg-green-500 text-white font-semibold py-2 rounded-lg transition-colors text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play Fullscreen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddBackgroundModal
          onSubmit={() => {
            setShowAddModal(false);
            loadVideos();
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}
      {playing && (
        <FullscreenPlayer
          videoId={playing.videoId}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
