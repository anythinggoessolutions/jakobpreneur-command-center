"use client";

import { QueuedTool } from "@/lib/types";

const hookColors = {
  A: "bg-amber-400",
  B: "bg-green-500",
  C: "bg-purple-500",
  D: "bg-blue-500",
  E: "bg-red-500",
  F: "bg-sky-500",
};

interface QueueItemProps {
  item: QueuedTool;
  position: number;
}

export default function QueueItem({ item, position }: QueueItemProps) {
  const { tool, script } = item;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
      <div className="text-zinc-300 font-mono text-sm w-5 text-center shrink-0">
        {position}
      </div>
      <div className={`w-2 h-2 rounded-full shrink-0 ${hookColors[script.hookType]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-900 text-sm font-semibold truncate">{tool.name}</span>
          <span className="text-zinc-300 text-xs">Pt. {tool.partNumber}</span>
        </div>
        <div className="text-zinc-400 text-xs truncate">{tool.category} &middot; {tool.source}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-green-600 text-xs font-bold">{tool.relevanceScore}</div>
      </div>
    </div>
  );
}
