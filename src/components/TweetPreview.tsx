"use client";

import { Tweet } from "@/lib/types";

const typeLabels: Record<Tweet["type"], { label: string; color: string }> = {
  tool_of_day: { label: "Tool of the Day", color: "bg-green-100 text-green-700" },
  quick_tip: { label: "Quick Tip", color: "bg-blue-100 text-blue-700" },
  engagement: { label: "Engagement", color: "bg-amber-100 text-amber-700" },
  fact: { label: "AI Fact", color: "bg-purple-100 text-purple-700" },
  repurposed_hook: { label: "Repurposed Hook", color: "bg-pink-100 text-pink-700" },
};

interface TweetPreviewProps {
  tweets: Tweet[];
}

export default function TweetPreview({ tweets }: TweetPreviewProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tweets for X</h3>
      </div>
      <div className="divide-y divide-zinc-100">
        {tweets.map((tweet, i) => {
          const info = typeLabels[tweet.type];
          return (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-zinc-300 text-xs font-mono">#{i + 1}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.color}`}>
                  {info.label}
                </span>
                <span className="text-zinc-300 text-xs ml-auto">{tweet.content.length}/280</span>
              </div>
              <p className="text-zinc-700 text-sm leading-relaxed">{tweet.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
