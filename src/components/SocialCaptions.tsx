"use client";

import { useState } from "react";
import { QueuedTool } from "@/lib/types";
import { generateCaptions } from "@/lib/caption-generator";

interface SocialCaptionsProps {
  item: QueuedTool;
}

const PLATFORM_STYLES = {
  instagram: {
    label: "Instagram",
    icon: "📸",
    color: "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200",
    textColor: "text-purple-700",
    limit: 2200,
  },
  tiktok: {
    label: "TikTok",
    icon: "🎵",
    color: "bg-zinc-900 border-zinc-800",
    textColor: "text-white",
    limit: 2200,
  },
  youtubeTitle: {
    label: "YouTube Title",
    icon: "▶️",
    color: "bg-red-50 border-red-200",
    textColor: "text-red-700",
    limit: 100,
  },
  youtubeDescription: {
    label: "YouTube Description",
    icon: "▶️",
    color: "bg-red-50 border-red-200",
    textColor: "text-red-700",
    limit: 5000,
  },
};

export default function SocialCaptions({ item }: SocialCaptionsProps) {
  const captions = generateCaptions(item);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const items: { key: keyof typeof captions; text: string }[] = [
    { key: "instagram", text: captions.instagram },
    { key: "tiktok", text: captions.tiktok },
    { key: "youtubeTitle", text: captions.youtubeTitle },
    { key: "youtubeDescription", text: captions.youtubeDescription },
  ];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Social Media Captions
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">Auto-generated per platform with relevant hashtags.</p>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map(({ key, text }) => {
          const style = PLATFORM_STYLES[key];
          const isOverLimit = text.length > style.limit;
          const isDark = key === "tiktok";
          return (
            <div key={key} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{style.icon}</span>
                  <span className={`text-sm font-semibold ${isDark ? "text-zinc-900" : style.textColor}`}>
                    {style.label}
                  </span>
                  <span className={`text-xs ${isOverLimit ? "text-red-500 font-semibold" : "text-zinc-400"}`}>
                    {text.length}/{style.limit}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(text, key)}
                  className="text-xs font-medium text-green-600 hover:text-green-700 cursor-pointer"
                >
                  {copied === key ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre
                className={`text-xs whitespace-pre-wrap break-words font-sans leading-relaxed rounded-lg p-3 border ${style.color} ${isDark ? "text-white" : "text-zinc-700"}`}
                style={{ maxHeight: "200px", overflow: "auto" }}
              >
                {text}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
