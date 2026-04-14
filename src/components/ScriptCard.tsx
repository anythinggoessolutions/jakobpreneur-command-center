"use client";

import { QueuedTool } from "@/lib/types";

interface ScriptCardProps {
  item: QueuedTool;
  onComplete: () => void;
  onReject: () => void;
}

const hookTypeLabels = {
  A: { label: "Curiosity Hook", color: "bg-amber-100 text-amber-700 border-amber-200" },
  B: { label: "Series Hook", color: "bg-green-100 text-green-700 border-green-200" },
  C: { label: "Bold Claim Hook", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

const sectionStyles: Record<string, { label: string; dot: string }> = {
  hook: { label: "Hook", dot: "bg-green-500" },
  bridge: { label: "Bridge", dot: "bg-blue-500" },
  benefit: { label: "Benefit", dot: "bg-amber-500" },
  demo: { label: "Demo", dot: "bg-purple-500" },
  close: { label: "Close", dot: "bg-green-500" },
};

function ScriptSection({ section, content }: { section: string; content: string }) {
  const style = sectionStyles[section];
  return (
    <div className="flex gap-3 items-start">
      <div className="flex items-center gap-2 shrink-0 w-20 pt-0.5">
        <div className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="text-xs font-semibold text-zinc-400 uppercase">{style.label}</span>
      </div>
      <p className="text-zinc-800 text-[15px] leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}

export default function ScriptCard({ item, onComplete, onReject }: ScriptCardProps) {
  const { tool, script, carousel } = item;
  const hookInfo = hookTypeLabels[script.hookType];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${hookInfo.color}`}>
                {hookInfo.label}
              </span>
              <span className="text-xs text-zinc-400">Part #{tool.partNumber}</span>
              <span className="text-xs text-zinc-400">&middot; ~{script.estimatedSeconds}s</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">{tool.name}</h2>
            <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm hover:underline">
              {tool.url} &#8599;
            </a>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 mb-0.5">Source</p>
            <p className="text-sm text-zinc-700 font-medium">{tool.source}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              <span className="text-xs text-green-700 font-semibold">{tool.relevanceScore}/100</span>
            </div>
          </div>
        </div>
        <p className="text-zinc-500 text-sm mt-3 leading-relaxed">{tool.description}</p>
      </div>

      {/* Script */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Script</h3>
        <div className="space-y-4 bg-zinc-50 rounded-lg p-5 border border-zinc-100">
          <ScriptSection section="hook" content={script.hook} />
          <ScriptSection section="bridge" content={script.bridge} />
          <ScriptSection section="benefit" content={script.benefit} />
          <ScriptSection section="demo" content={script.demo} />
          <ScriptSection section="close" content={script.close} />
        </div>
      </div>

      {/* Carousel Angle */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Carousel Angle</h3>
        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              carousel.type === "famous_person"
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-green-50 text-green-600 border-green-200"
            }`}>
              {carousel.type === "famous_person" ? "Famous Person" : "Tool Breakdown"}
            </span>
          </div>
          <p className="text-zinc-800 font-semibold text-sm mb-3">{carousel.headline}</p>
          <div className="space-y-1.5">
            {carousel.slides.map((slide, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-zinc-300 shrink-0 font-mono text-xs mt-0.5">{i + 2}</span>
                <span className="text-zinc-600">{slide}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 flex gap-3 bg-zinc-50">
        <button
          onClick={onComplete}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors text-sm cursor-pointer"
        >
          Complete &mdash; Mark as Recorded
        </button>
        <button
          onClick={onReject}
          className="flex-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 font-semibold py-3 rounded-lg transition-colors text-sm cursor-pointer"
        >
          Not This One
        </button>
      </div>
    </div>
  );
}
