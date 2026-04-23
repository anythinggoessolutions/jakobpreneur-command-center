"use client";

import { useState } from "react";

type HookCode = "A" | "B" | "C" | "D" | "E" | "F";

interface AddToolModalProps {
  onSubmit: (tool: { name: string; url: string; reason: string; hookType: HookCode }) => void;
  onCancel: () => void;
}

// Pre-computed Tailwind class strings per hook color. Tailwind doesn't see
// dynamic template strings (`bg-${color}-50`) at build time, so we keep an
// explicit map here — otherwise the classes get purged and selected hooks
// render with no color.
const HOOK_COLOR_STYLES: Record<
  HookCode,
  { bg: string; border: string; text: string }
> = {
  A: { bg: "#fffbeb", border: "#fcd34d", text: "#b45309" },   // amber
  B: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },   // green
  C: { bg: "#faf5ff", border: "#c4b5fd", text: "#7c3aed" },   // purple
  D: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },   // blue
  E: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" },   // red
  F: { bg: "#f0f9ff", border: "#7dd3fc", text: "#0369a1" },   // sky
};

const HOOK_OPTIONS: Array<{ value: HookCode; label: string; desc: string }> = [
  { value: "B", label: "Series", desc: "Part of the numbered series" },
  { value: "A", label: "Curiosity", desc: "\"Nobody talks about this…\"" },
  { value: "C", label: "Bold Claim", desc: "Provocative statement" },
  { value: "D", label: "Insider", desc: "\"They don't want you to know…\"" },
  { value: "E", label: "Urgency", desc: "\"Bookmark before it goes viral\"" },
  { value: "F", label: "Replace-It", desc: "\"Stop using X. Use this instead.\"" },
];

export default function AddToolModal({ onSubmit, onCancel }: AddToolModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [hookType, setHookType] = useState<HookCode>("B");
  const [generating, setGenerating] = useState(false);

  const canSubmit = name.trim() && url.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    setGenerating(true);
    // Simulate AI script generation delay
    setTimeout(() => {
      onSubmit({ name: name.trim(), url: url.trim(), reason: reason.trim(), hookType });
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100">
          <h3 className="text-zinc-900 font-bold text-lg">Add a Tool</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Submit a website or tool. Claude will research it and generate a ready-to-record script.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tool name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Tool / Website Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gamma, My AI Project, BrandName"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
            />
          </div>

          {/* Reason / context */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
              Context <span className="text-zinc-300 normal-case">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brand deal, my own project, viewer request, cool find..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
              rows={2}
            />
          </div>

          {/* Hook type */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Hook Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HOOK_OPTIONS.map((opt) => {
                const isActive = hookType === opt.value;
                const style = HOOK_COLOR_STYLES[opt.value];
                return (
                  <button
                    key={opt.value}
                    onClick={() => setHookType(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      isActive
                        ? "font-medium border-2"
                        : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.text,
                            borderWidth: "2px",
                          }
                        : {}
                    }
                  >
                    <div className="font-semibold text-xs">{opt.label}</div>
                    <div className="text-[11px] opacity-70 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 bg-zinc-50">
          <button
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || generating}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            {generating ? "Generating script..." : "Add to Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}
