"use client";

import { useState } from "react";

interface AddToolModalProps {
  onSubmit: (tool: { name: string; url: string; reason: string; hookType: "A" | "B" | "C" }) => void;
  onCancel: () => void;
}

export default function AddToolModal({ onSubmit, onCancel }: AddToolModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [hookType, setHookType] = useState<"A" | "B" | "C">("B");
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
            <div className="flex gap-2">
              {([
                { value: "B" as const, label: "Series", desc: "Part of the numbered series", color: "green" },
                { value: "A" as const, label: "Curiosity", desc: "\"I was today years old...\"", color: "amber" },
                { value: "C" as const, label: "Bold Claim", desc: "Provocative statement", color: "purple" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHookType(opt.value)}
                  className={`flex-1 text-left px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    hookType === opt.value
                      ? `bg-${opt.color}-50 border-${opt.color}-300 border-2 font-medium text-${opt.color}-700`
                      : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                  style={hookType === opt.value ? {
                    backgroundColor: opt.color === "green" ? "#f0fdf4" : opt.color === "amber" ? "#fffbeb" : "#faf5ff",
                    borderColor: opt.color === "green" ? "#86efac" : opt.color === "amber" ? "#fcd34d" : "#c4b5fd",
                    borderWidth: "2px",
                    color: opt.color === "green" ? "#15803d" : opt.color === "amber" ? "#b45309" : "#7c3aed",
                  } : {}}
                >
                  <div className="font-semibold text-xs">{opt.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
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
