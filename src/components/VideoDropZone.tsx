"use client";

import { useState, useCallback } from "react";

interface DroppedFile {
  name: string;
  size: string;
  type: string;
  file: File;
}

const MODE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  "mode-1": {
    label: "Mode 1: Face-cam Only",
    description: "iPhone recording — captions in lower middle, face detection active",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  "mode-2": {
    label: "Mode 2: Screen Recording Only",
    description: "OBS Studio recording — captions on top, no face detection",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "mode-3": {
    label: "Mode 3: Face-cam + Screen Recording",
    description: "Mixed — face-cam stitched first, then screen recording",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  "mode-3-vo": {
    label: "Mode 3 + Voiceover",
    description: "Mixed with separate voiceover audio for screen recording segment",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function detectMode(files: DroppedFile[]): string {
  const videoFiles = files.filter((f) => f.type.startsWith("video/"));
  const audioFiles = files.filter((f) => f.type.startsWith("audio/"));

  if (videoFiles.length === 1 && audioFiles.length === 0) return "mode-1";
  if (videoFiles.length === 1 && audioFiles.length === 0 && videoFiles[0].name.toLowerCase().includes("screen")) return "mode-2";
  if (videoFiles.length === 2 && audioFiles.length === 0) return "mode-3";
  if (videoFiles.length === 2 && audioFiles.length >= 1) return "mode-3-vo";
  if (videoFiles.length === 1) return "mode-1";
  return "mode-1";
}

export default function VideoDropZone() {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("video/") || f.type.startsWith("audio/"))
      .map((f) => ({
        name: f.name,
        size: formatSize(f.size),
        type: f.type,
        file: f,
      }));
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
      .filter((f) => f.type.startsWith("video/") || f.type.startsWith("audio/"))
      .map((f) => ({
        name: f.name,
        size: formatSize(f.size),
        type: f.type,
        file: f,
      }));
    if (selected.length > 0) {
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setFiles([]);

  const handleProcess = () => {
    setProcessing(true);
    // Placeholder — actual processing pipeline TBD
    setTimeout(() => {
      setProcessing(false);
      alert("Video processing pipeline coming soon! Files are ready for the next phase.");
    }, 2000);
  };

  const detectedMode = files.length > 0 ? detectMode(files) : null;
  const modeInfo = detectedMode ? MODE_LABELS[detectedMode] : null;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Video Drop Zone
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Drop your recorded videos here. Mode auto-detected from files.</p>
          </div>
          {files.length > 0 && (
            <button onClick={clearAll} className="text-xs text-zinc-400 hover:text-red-500 cursor-pointer">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Drop area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`mx-4 mt-4 mb-2 rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-green-400 bg-green-50"
            : files.length > 0
            ? "border-zinc-200 bg-zinc-50"
            : "border-zinc-300 bg-zinc-50"
        }`}
      >
        {files.length === 0 ? (
          <label className="flex flex-col items-center justify-center py-10 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mb-3 ${isDragging ? "text-green-400" : "text-zinc-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-zinc-500">
              {isDragging ? "Drop files here" : "Drag & drop video files here"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">MP4, MKV, MOV, or audio files</p>
            <p className="text-xs text-green-600 font-medium mt-2">or click to browse</p>
            <input
              type="file"
              accept="video/*,audio/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        ) : (
          <div className="p-4">
            {/* Auto-detected mode */}
            {modeInfo && (
              <div className={`mb-3 px-3 py-2 rounded-lg border text-xs font-medium ${modeInfo.color}`}>
                {modeInfo.label} — {modeInfo.description}
              </div>
            )}

            {/* File list */}
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-zinc-200 px-3 py-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    f.type.startsWith("video/") ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                  }`}>
                    {f.type.startsWith("video/") ? "VID" : "AUD"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 font-medium truncate">{f.name}</p>
                    <p className="text-xs text-zinc-400">{f.size} &middot; {f.type.split("/")[1]?.toUpperCase()}</p>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-zinc-300 hover:text-red-500 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add more files */}
            <label className="mt-3 flex items-center justify-center gap-2 py-2 border border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 text-xs text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add more files
              <input type="file" accept="video/*,audio/*" multiple onChange={handleFileInput} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* Process button */}
      {files.length > 0 && (
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                Process {files.length} file{files.length > 1 ? "s" : ""} &rarr; Generate Output
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
