"use client";

import { useState } from "react";
import ScriptCard from "@/components/ScriptCard";
import TweetPreview from "@/components/TweetPreview";
import QueueItem from "@/components/QueueItem";
import RejectModal from "@/components/RejectModal";
import AddToolModal from "@/components/AddToolModal";
import VideoDropZone from "@/components/VideoDropZone";
import SocialCaptions from "@/components/SocialCaptions";
import { mockQueue } from "@/lib/mock-data";
import { QueuedTool } from "@/lib/types";

export default function ContentPage() {
  const [queue, setQueue] = useState<QueuedTool[]>(mockQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  const currentItem = queue[currentIndex];
  const queueItems = queue.slice(currentIndex + 1, currentIndex + 6);
  const remainingCount = queue.length - currentIndex;

  const handleAddTool = (input: { name: string; url: string; reason: string; hookType: "A" | "B" | "C" }) => {
    const newId = String(Date.now());
    const partNum = queue.length + 1;
    const hookTemplates = {
      A: `I was today years old when I found this out.\nDid you know ${input.name} can [describe the key feature]?`,
      B: `@jakobpreneur: Powerful AI Tools You Need To Know. Part ${partNum}.\nIf you go to this website, you can [primary benefit].`,
      C: `[Bold statement about the problem ${input.name} solves].\nDid you know if you [action], it'll [result]?`,
    };
    const newTool: QueuedTool = {
      tool: {
        id: newId, name: input.name, url: input.url,
        source: input.reason || "Manual submission",
        category: "Custom", description: `Manually added. Claude will research ${input.url} and generate a full script.`,
        status: "queued", partNumber: partNum, hookType: input.hookType, relevanceScore: 99,
      },
      script: {
        toolId: newId, hookType: input.hookType,
        hook: hookTemplates[input.hookType],
        bridge: "Did you know if you go to this website...",
        benefit: `[Claude will research ${input.name} and fill this in]`,
        demo: "You can [feature 1].\nAnd you can [feature 2].\nYou can also [feature 3].",
        close: "Now you know.",
        fullScript: `${hookTemplates[input.hookType]}\n\n[Script will be generated after researching ${input.url}]\n\nNow you know.`,
        estimatedSeconds: 22,
      },
      tweets: [
        { toolId: newId, content: `Check out ${input.name} \u2014 [to be generated]. ${input.url}`, type: "tool_of_day" },
        { toolId: newId, content: `Quick tip: [to be generated for ${input.name}].`, type: "quick_tip" },
        { toolId: newId, content: `[Engagement question about ${input.name} to be generated]`, type: "engagement" },
        { toolId: newId, content: `[AI fact about ${input.name} to be generated]`, type: "fact" },
        { toolId: newId, content: `[Repurposed hook for ${input.name}]. Now you know.`, type: "repurposed_hook" },
      ],
      carousel: {
        toolId: newId, type: "tool_breakdown",
        headline: `[Carousel headline for ${input.name} to be generated]`,
        slides: ["What it does: [TBD]", "How to use it: [TBD]", "Why it matters: [TBD]", "Who it's for: [TBD]"],
      },
    };
    const newQueue = [...queue];
    newQueue.splice(currentIndex + 1, 0, newTool);
    setQueue(newQueue);
    setShowAddModal(false);
  };

  const handleComplete = async () => {
    const tool = currentItem.tool;
    // Schedule the video via API
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

  const handleConfirmReject = (reason: string) => {
    console.log(`Rejected ${currentItem.tool.name}: ${reason}`);
    setRejectedCount((c) => c + 1);
    setShowRejectModal(false);
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!currentItem) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Queue Empty</h2>
        <p className="text-zinc-500">All tools have been processed. Claude is discovering more...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Stats bar */}
      <div className="flex items-center gap-5 mb-6">
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
          <span className="text-xs text-zinc-400 font-medium">Powerful AI Tools You Need To Know</span>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="xl:col-span-2 space-y-6">
          <div>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
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
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
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
          <div className="mt-4 p-4 bg-white rounded-lg border border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 uppercase font-bold">Queue Health</span>
              <span className={`text-xs font-bold ${remainingCount >= 20 ? "text-green-600" : remainingCount >= 10 ? "text-amber-600" : "text-red-500"}`}>
                {remainingCount >= 20 ? "Healthy" : remainingCount >= 10 ? "Low" : "Critical"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${remainingCount >= 20 ? "bg-green-500" : remainingCount >= 10 ? "bg-amber-400" : "bg-red-500"}`}
                style={{ width: `${Math.min(100, (remainingCount / 25) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              Target: 20+ tools ready
            </p>
          </div>

          {/* Video Drop Zone */}
          <div className="mt-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Upload Recorded Videos
            </h2>
            <VideoDropZone
              seriesText={
                currentItem.script.hookType === "B"
                  ? `AI TOOLS YOU NEED TO KNOW. PART ${currentItem.tool.partNumber}.`
                  : undefined
              }
            />
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
