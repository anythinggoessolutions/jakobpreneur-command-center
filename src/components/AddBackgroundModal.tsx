"use client";

import { useState } from "react";

const CATEGORIES = ["Cartoons", "Pixel Art", "TV Moments", "ASMR", "Memes", "Animated Shorts", "Nostalgia", "Random"];

interface AddBackgroundModalProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AddBackgroundModal({ onSubmit, onCancel }: AddBackgroundModalProps) {
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<{ videoId: string; title: string; thumbnailUrl: string } | null>(null);
  const [category, setCategory] = useState("Random");
  const [duration, setDuration] = useState("");
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setError("");
    try {
      const res = await fetch(`/api/youtube-meta?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMeta(data);
      }
    } catch {
      setError("Failed to fetch video metadata");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      const res = await fetch("/api/backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: url,
          videoId: meta.videoId,
          title: meta.title,
          thumbnailUrl: meta.thumbnailUrl,
          category,
          duration,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onSubmit();
      }
    } catch {
      setError("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100">
          <h3 className="text-zinc-900 font-bold text-lg">Add Background Video</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Paste a YouTube URL. We'll fetch the title and thumbnail automatically.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              YouTube URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
              />
              <button
                onClick={handleFetch}
                disabled={!url.trim() || fetching}
                className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-medium px-4 py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
              >
                {fetching ? "Fetching..." : "Fetch"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {meta && (
            <>
              <div className="flex gap-3 bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={meta.thumbnailUrl} alt={meta.title} className="w-32 h-20 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 line-clamp-2">{meta.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">ID: {meta.videoId}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                        category === cat
                          ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Duration <span className="text-zinc-300 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 3:42 or 10:00:00"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 bg-zinc-50">
          <button
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!meta || saving}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            {saving ? "Saving..." : "Add to Library"}
          </button>
        </div>
      </div>
    </div>
  );
}
