"use client";

import { useState, useEffect } from "react";
import ScriptCard from "@/components/ScriptCard";
import TweetPreview from "@/components/TweetPreview";
import QueueItem from "@/components/QueueItem";
import RejectModal from "@/components/RejectModal";
import AddToolModal from "@/components/AddToolModal";
import VideoDropZone from "@/components/VideoDropZone";
import SocialCaptions from "@/components/SocialCaptions";
import { generateCaptions } from "@/lib/caption-generator";
import { QueuedTool } from "@/lib/types";

export default function ContentPage() {
  const [queue, setQueue] = useState<QueuedTool[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState<string | null>(null);

  const refetchQueue = async () => {
    const res = await fetch("/api/tools/queue", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setQueue(data.queue || []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refetchQueue();
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDiscoverMore = async () => {
    if (discovering) return;
    setDiscovering(true);
    setDiscoverMessage("Searching the web for new tools — this takes 2-3 min…");
    try {
      const res = await fetch("/api/tools/discover", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDiscoverMessage(`Discovery failed: ${data.error || `HTTP ${res.status}`}`);
        return;
      }
      const persisted = data.persisted ?? 0;
      const failed = data.failed ?? 0;
      setDiscoverMessage(
        persisted > 0
          ? `Added ${persisted} new tool${persisted === 1 ? "" : "s"} to the queue.${failed ? ` (${failed} failed)` : ""}`
          : "No new tools added (all duplicates or failed).",
      );
      await refetchQueue();
    } catch (err) {
      setDiscoverMessage(`Discovery failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDiscovering(false);
      // Auto-clear the message after 8 seconds
      setTimeout(() => setDiscoverMessage(null), 8000);
    }
  };

  const currentItem = queue[currentIndex];
  const queueItems = queue.slice(currentIndex + 1, currentIndex + 6);
  const remainingCount = queue.length - currentIndex;

  const handleAddTool = async (input: { name: string; url: string; reason: string; hookType: "A" | "B" | "C" }) => {
    // Optimistic placeholder while Claude generates and persists to Airtable.
    const tempId = `temp-${Date.now()}`;
    const partNum = queue.length + 1;
    const placeholderHook: Record<"A" | "B" | "C", string> = {
      A: `I was today years old when I found this out.\nDid you know ${input.name} can [generating...]?`,
      B: `@jakobpreneur: Powerful AI Tools You Should Know. Part ${partNum}.\nIf you go to this website, you can [generating...]`,
      C: `[Generating bold claim about ${input.name}...]\nDid you know if you [action], it'll [result]?`,
    };
    const placeholderTool: QueuedTool = {
      tool: {
        id: tempId, name: input.name, url: input.url,
        source: input.reason || "Manual submission",
        category: "Generating…", description: `Claude is generating and saving a full bundle for ${input.name}.`,
        status: "queued", partNumber: partNum, hookType: input.hookType, relevanceScore: 99,
      },
      script: {
        toolId: tempId, hookType: input.hookType,
        hook: placeholderHook[input.hookType],
        bridge: "Did you know if you go to this website...",
        benefit: "Generating…",
        demo: "Generating demo narration…",
        close: "Now you know.",
        fullScript: `${placeholderHook[input.hookType]}\n\nGenerating…\n\nNow you know.`,
        estimatedSeconds: 22,
      },
      tweets: [
        { toolId: tempId, content: "Generating tweet…", type: "tool_of_day" },
        { toolId: tempId, content: "Generating tweet…", type: "quick_tip" },
        { toolId: tempId, content: "Generating tweet…", type: "engagement" },
        { toolId: tempId, content: "Generating tweet…", type: "fact" },
        { toolId: tempId, content: "Generating tweet…", type: "repurposed_hook" },
      ],
      carousel: {
        toolId: tempId, type: "tool_breakdown",
        headline: "Generating carousel headline…",
        slides: [
          "WHAT IT DOES: generating…",
          "HOW TO USE IT: generating…",
          "WHY IT MATTERS: generating…",
          "WHO IT'S FOR: generating…",
        ],
      },
    };
    setQueue((q) => {
      const next = [...q];
      next.splice(currentIndex + 1, 0, placeholderTool);
      return next;
    });
    setShowAddModal(false);

    // Generate + persist (Tool + Script in Airtable) and replace placeholder with the real record.
    try {
      const res = await fetch("/api/tools/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          url: input.url,
          hookType: input.hookType,
          reason: input.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const queuedTool = (await res.json()) as QueuedTool;
      setQueue((q) => q.map((item) => (item.tool.id === tempId ? queuedTool : item)));
    } catch (err) {
      console.error("Tool add failed:", err);
      setQueue((q) =>
        q.map((item) =>
          item.tool.id !== tempId
            ? item
            : {
                ...item,
                tool: {
                  ...item.tool,
                  category: "Generation failed",
                  description: `Error: ${err instanceof Error ? err.message : String(err)}. Remove and retry.`,
                },
              },
        ),
      );
    }
  };

  const handleComplete = async () => {
    const tool = currentItem.tool;
    // Mark Tool as recorded in Airtable (only if it's an Airtable record id, not a temp placeholder)
    if (!tool.id.startsWith("temp-")) {
      try {
        await fetch(`/api/tools/${tool.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "recorded" }),
        });
      } catch (err) {
        console.error("Failed to mark recorded:", err);
      }
    }
    // Reserve a video schedule slot
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: tool.name,
          partNumber: tool.partNumber,
          themeTag: tool.category,
        }),
      });
      const data = await res.json();
      if (data.scheduledDate) {
        console.log(`Scheduled ${tool.name} for ${data.scheduledDate} at ${data.scheduledTime}`);
      }
    } catch (err) {
      console.error("Failed to schedule:", err);
    }
    setCompletedCount((c) => c + 1);
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (reason: string) => {
    const tool = currentItem.tool;
    if (!tool.id.startsWith("temp-")) {
      try {
        await fetch(`/api/tools/${tool.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected", rejectionReason: reason }),
        });
      } catch (err) {
        console.error("Failed to mark rejected:", err);
      }
    }
    setRejectedCount((c) => c + 1);
    setShowRejectModal(false);
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Loading queue…</h2>
        <p className="text-zinc-500">Fetching tools from Airtable.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Failed to load queue</h2>
        <p className="text-zinc-500">{loadError}</p>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Queue Empty</h2>
        <p className="text-zinc-500 mb-6">
          No queued tools. Auto-discovery runs daily at 7am EST and adds new ones — or trigger one now.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={handleDiscoverMore}
            disabled={discovering}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            {discovering ? "Discovering…" : "Discover More"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-900 text-sm font-semibold rounded-lg cursor-pointer"
          >
            Add Tool Manually
          </button>
        </div>
        {discoverMessage && (
          <div className="mt-6 mx-auto max-w-md px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700">
            {discoverMessage}
          </div>
        )}
        {showAddModal && (
          <AddToolModal
            onSubmit={handleAddTool}
            onCancel={() => setShowAddModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-8">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-sm text-zinc-500">
            <span className="text-zinc-900 font-semibold">{completedCount}</span> recorded
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-sm text-zinc-500">
            <span className="text-zinc-900 font-semibold">{rejectedCount}</span> skipped
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-sm text-zinc-500">
            <span className="text-zinc-900 font-semibold">{remainingCount}</span> in queue
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-medium">Powerful AI Tools You Should Know</span>
          <button
            onClick={handleDiscoverMore}
            disabled={discovering}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-900 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${discovering ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {discovering ? "Discovering…" : "Discover More"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Tool
          </button>
        </div>
      </div>

      {discoverMessage && (
        <div className="mb-4 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700">
          {discoverMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-8">
          <div>
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
              Next Video to Record
            </h2>
            <ScriptCard
              item={currentItem}
              onComplete={handleComplete}
              onReject={handleReject}
            />
          </div>

          <SocialCaptions item={currentItem} />
          <TweetPreview tweets={currentItem.tweets} />
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
            Up Next
          </h2>
          <div className="space-y-2">
            {queueItems.map((item, i) => (
              <QueueItem key={item.tool.id} item={item} position={i + 2} />
            ))}
          </div>

          {queueItems.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              No more tools in queue
            </div>
          )}

          {/* Queue health */}
          <div className="mt-6 p-5 bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-zinc-400 uppercase font-bold tracking-[0.12em]">Queue Health</span>
              <span className={`text-xs font-semibold ${remainingCount >= 20 ? "text-green-600" : remainingCount >= 10 ? "text-amber-600" : "text-zinc-500"}`}>
                {remainingCount >= 20 ? "Healthy" : remainingCount >= 10 ? "Low" : `${remainingCount} left`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${remainingCount >= 20 ? "bg-green-500" : remainingCount >= 10 ? "bg-amber-400" : "bg-zinc-400"}`}
                style={{ width: `${Math.min(100, (remainingCount / 25) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2.5 font-light">
              Target: 20+ tools ready
            </p>
          </div>

          {/* Video Drop Zone */}
          <div className="mt-6">
            <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
              Upload Recorded Videos
            </h2>
            {(() => {
              const captions = generateCaptions(currentItem);
              return (
                <VideoDropZone
                  seriesText={
                    currentItem.script.hookType === "B"
                      // Pull the first line of the generated hook under the
                      // hook-only-is-hook rule ("…Part N."), then strip the
                      // spoken "@jakobpreneur: " prefix since it shouldn't
                      // appear in the burned-in overlay. Supports both
                      // "Powerful AI Tools…" and "Powerful Websites…" variants.
                      ? (currentItem.script.hook.split("\n")[0] || "")
                          .replace(/^@jakobpreneur:\s*/i, "")
                          .trim()
                      : undefined
                  }
                  publishPayload={{
                    title: captions.youtubeTitle,
                    youtubeDescription: captions.youtubeDescription,
                    instagramCaption: captions.instagram,
                    tiktokCaption: captions.tiktok,
                    tweets: currentItem.tweets.map((t) => t.content),
                    carouselSpec: {
                      headline: currentItem.carousel.headline,
                      slides: currentItem.carousel.slides,
                      carouselType: currentItem.carousel.type,
                      toolName: currentItem.tool.name,
                      toolUrl: currentItem.tool.url,
                    },
                  }}
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showRejectModal && (
        <RejectModal
          toolName={currentItem.tool.name}
          onConfirm={handleConfirmReject}
          onCancel={() => setShowRejectModal(false)}
        />
      )}
      {showAddModal && (
        <AddToolModal
          onSubmit={handleAddTool}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
