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
    <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-7 py-5 border-b border-zinc-100">
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Tweets for X</h3>
        <p className="text-sm text-zinc-500 mt-1 font-light">
          5 tweets — fired one per slot at 9am / 12pm / 3pm / 6pm / 9pm EST.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-100">
        {tweets.map((tweet, i) => {
          const info = typeLabels[tweet.type];
          return (
            <div key={i} className="bg-white px-6 py-5">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-zinc-300 text-xs font-mono">#{i + 1}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${info.color}`}>
                  {info.label}
                </span>
                <span className="text-zinc-300 text-xs ml-auto">{tweet.content.length}/280</span>
              </div>
              <p className="text-zinc-700 text-[13px] leading-[1.7] whitespace-pre-line">{tweet.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
