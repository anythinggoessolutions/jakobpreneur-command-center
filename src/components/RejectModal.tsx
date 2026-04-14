"use client";

import { useState } from "react";

interface RejectModalProps {
  toolName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const quickReasons = [
  "Too similar to a previous video",
  "Tool isn't interesting enough",
  "Tool is too niche for my audience",
  "I've already covered this category recently",
  "Tool requires paid subscription",
  "Tool is too complicated to demo in 30 seconds",
];

export default function RejectModal({ toolName, onConfirm, onCancel }: RejectModalProps) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100">
          <h3 className="text-zinc-900 font-bold text-lg">Skip {toolName}</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Pick a reason so Claude learns what to avoid.
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-2 mb-4">
            {quickReasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  reason === r
                    ? "bg-red-50 text-red-600 border border-red-200 font-medium"
                    : "bg-zinc-50 text-zinc-700 border border-zinc-200 hover:border-zinc-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            value={quickReasons.includes(reason) ? "" : reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Or type a custom reason..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
            rows={2}
          />
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 bg-zinc-50">
          <button
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            Skip This Tool
          </button>
        </div>
      </div>
    </div>
  );
}
