"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface DroppedFile {
  name: string;
  size: string;
  type: string;
  file: File;
}

interface Job {
  id: string;
  status: string;
  step?: string;
  progress?: number;
  mode?: string;
  output_file?: string;
  error?: string;
}

const PIPELINE_URL = "http://localhost:8765";

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
    description: "Mixed with separate voiceover audio",
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
  if (videoFiles.length === 2 && audioFiles.length === 0) return "mode-3";
  if (videoFiles.length === 2 && audioFiles.length >= 1) return "mode-3-vo";
  if (videoFiles.length === 1) return "mode-1";
  return "mode-1";
}

interface PublishPayload {
  title: string;
  youtubeDescription: string;
  instagramCaption: string;
  tiktokCaption: string;
  tweets: string[];
  carouselSpec?: {
    headline: string;
    slides: string[];
    carouselType: "famous_person" | "tool_breakdown" | "aspiration";
    toolName: string;
    toolUrl: string;
    aspiration?: import("@/lib/types").AspirationSlides;
  };
}

interface VideoDropZoneProps {
  seriesText?: string;
  publishPayload?: PublishPayload;
}

export default function VideoDropZone({ seriesText, publishPayload }: VideoDropZoneProps = {}) {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [serverStatus, setServerStatus] = useState<"unknown" | "running" | "stopped">("unknown");
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Ping server on mount + every 5s
  const checkServerStatus = useCallback(async () => {
    try {
      const res = await fetch(`${PIPELINE_URL}/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        setServerStatus("running");
        return true;
      }
    } catch {
      // ignore
    }
    setServerStatus("stopped");
    return false;
  }, []);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  // Poll job status when processing
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`${PIPELINE_URL}/jobs/${jobId}`);
      if (res.ok) {
        const job = await res.json();
        setCurrentJob(job);
        if (job.status === "complete" || job.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    } catch {
      // server may have stopped
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("video/") || f.type.startsWith("audio/"))
      .map((f) => ({ name: f.name, size: formatSize(f.size), type: f.type, file: f }));
    if (droppedFiles.length > 0) setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
      .filter((f) => f.type.startsWith("video/") || f.type.startsWith("audio/"))
      .map((f) => ({ name: f.name, size: formatSize(f.size), type: f.type, file: f }));
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setCurrentJob(null);
    // CRITICAL: also clear publishResults + publishing. Otherwise the next
    // video's "complete" state inherits the previous job's success card,
    // hiding the Schedule button and making it look like the new video
    // auto-scheduled when actually nothing was sent to Vercel/Airtable.
    setPublishResults(null);
    setPublishing(false);
  };

  const handleProcess = async () => {
    if (!files.length) return;
    if (serverStatus !== "running") {
      alert("Video pipeline server is not running. Start it with:\n\n/jakobpreneur/pipeline/start.sh");
      return;
    }

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f.file));
    if (seriesText) formData.append("series_text", seriesText);

    try {
      const res = await fetch(`${PIPELINE_URL}/process`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.job_id) {
        setCurrentJob({ id: data.job_id, status: "queued", progress: 0 });
        // Poll every 2 seconds
        pollRef.current = setInterval(() => pollJob(data.job_id), 2000);
      }
    } catch (err) {
      alert("Failed to start processing: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStopServer = async () => {
    if (!confirm("Stop the video pipeline server? LaunchAgent will auto-restart it.")) return;
    try {
      await fetch(`${PIPELINE_URL}/shutdown`, { method: "POST" });
      setTimeout(() => checkServerStatus(), 1000);
    } catch {
      // ignore
    }
  };

  const handleRestartServer = async () => {
    try {
      // Trigger shutdown — LaunchAgent will auto-restart in ~10s
      await fetch(`${PIPELINE_URL}/shutdown`, { method: "POST" });
    } catch {
      // ignore — server might already be down
    }
    // Poll until it comes back online
    setServerStatus("unknown");
    const maxTries = 20;
    for (let i = 0; i < maxTries; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const up = await checkServerStatus();
      if (up) break;
    }
  };

  const downloadOutput = () => {
    if (currentJob?.id) {
      window.open(`${PIPELINE_URL}/output/${currentJob.id}`, "_blank");
    }
  };

  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; url?: string; error?: string; scheduled?: boolean; scheduledDate?: string; scheduledTime?: string; scheduledDatetime?: string; platforms?: string[] }> | null>(null);
  // TikTok is intentionally OFF by default while the Content Posting API
  // audit is pending (submitted 2026-05-08, 2-4 week SLA). Unaudited apps
  // get 403 unaudited_client_can_only_post_to_private_accounts on every
  // public DIRECT_POST attempt, so leaving TikTok on would burn 3 retry
  // slots per video and cause noise. Re-enable in the default set once the
  // audit lands.
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(["youtube", "x", "instagram"]));

  // TikTok Content Sharing Guidelines: privacy / interaction / commercial
  // disclosure values must come from creator_info, not be hardcoded.
  type TikTokCreatorInfo = {
    creatorAvatarUrl: string;
    creatorUsername: string;
    creatorNickname: string;
    privacyLevelOptions: string[];
    commentDisabled: boolean;
    duetDisabled: boolean;
    stitchDisabled: boolean;
    maxVideoPostDurationSec: number;
  };
  const [tiktokInfo, setTiktokInfo] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokInfoLoading, setTiktokInfoLoading] = useState(false);
  const [tiktokInfoError, setTiktokInfoError] = useState<string | null>(null);
  const [tiktokPrivacy, setTiktokPrivacy] = useState<string>("");
  const [tiktokDisableComment, setTiktokDisableComment] = useState(false);
  const [tiktokDisableDuet, setTiktokDisableDuet] = useState(false);
  const [tiktokDisableStitch, setTiktokDisableStitch] = useState(false);
  const [tiktokDisclose, setTiktokDisclose] = useState(false);
  const [tiktokBrandedContent, setTiktokBrandedContent] = useState(false);
  const [tiktokYourBrand, setTiktokYourBrand] = useState(false);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // Fetch creator_info the first time TikTok becomes selected. Cached for
  // the rest of the session; the cron will re-query at post time so any
  // shift in allowed values between scheduling and posting is caught
  // server-side.
  useEffect(() => {
    if (!selectedPlatforms.has("tiktok")) return;
    if (tiktokInfo || tiktokInfoLoading) return;
    setTiktokInfoLoading(true);
    setTiktokInfoError(null);
    fetch("/api/auth/tiktok/creator-info")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        return data as TikTokCreatorInfo;
      })
      .then((info) => {
        setTiktokInfo(info);
        setTiktokPrivacy(info.privacyLevelOptions[0] || "");
        setTiktokDisableComment(info.commentDisabled);
        setTiktokDisableDuet(info.duetDisabled);
        setTiktokDisableStitch(info.stitchDisabled);
      })
      .catch((err) => setTiktokInfoError(err instanceof Error ? err.message : String(err)))
      .finally(() => setTiktokInfoLoading(false));
  }, [selectedPlatforms, tiktokInfo, tiktokInfoLoading]);

  // Branded content can't post as SELF_ONLY per TikTok policy. If user
  // toggles brand content while privacy is private, lift them to public.
  useEffect(() => {
    if (tiktokDisclose && tiktokBrandedContent && tiktokPrivacy === "SELF_ONLY") {
      const fallback = tiktokInfo?.privacyLevelOptions.find((p) => p !== "SELF_ONLY");
      if (fallback) setTiktokPrivacy(fallback);
    }
  }, [tiktokDisclose, tiktokBrandedContent, tiktokPrivacy, tiktokInfo]);

  const tiktokCompliancePending =
    selectedPlatforms.has("tiktok") &&
    (tiktokInfoLoading ||
      !tiktokInfo ||
      !tiktokPrivacy ||
      (tiktokDisclose && !tiktokBrandedContent && !tiktokYourBrand));

  const handlePublish = async () => {
    if (!currentJob?.id || !publishPayload) return;
    if (!confirm(`Schedule for ${Array.from(selectedPlatforms).join(", ")}? Videos post at the next open 9am/1pm/7pm EDT slot.`)) return;
    setPublishing(true);
    try {
      const formData = new FormData();
      formData.append("job_id", currentJob.id);
      formData.append("title", publishPayload.title);
      formData.append("youtube_description", publishPayload.youtubeDescription);
      formData.append("instagram_caption", publishPayload.instagramCaption);
      formData.append("tiktok_caption", publishPayload.tiktokCaption);
      formData.append("tweets", JSON.stringify(publishPayload.tweets));
      formData.append("platforms", Array.from(selectedPlatforms).join(","));
      if (selectedPlatforms.has("tiktok")) {
        formData.append("tiktok_privacy_level", tiktokPrivacy);
        formData.append("tiktok_disable_comment", tiktokDisableComment ? "1" : "0");
        formData.append("tiktok_disable_duet", tiktokDisableDuet ? "1" : "0");
        formData.append("tiktok_disable_stitch", tiktokDisableStitch ? "1" : "0");
        formData.append("tiktok_disclose", tiktokDisclose ? "1" : "0");
        formData.append("tiktok_branded_content", tiktokBrandedContent ? "1" : "0");
        formData.append("tiktok_your_brand", tiktokYourBrand ? "1" : "0");
      }
      if (publishPayload.carouselSpec) {
        formData.append("carousel_spec", JSON.stringify(publishPayload.carouselSpec));
      }

      const res = await fetch(`${PIPELINE_URL}/publish`, { method: "POST", body: formData });
      const data = await res.json();
      setPublishResults(data.results || {});
    } catch (err) {
      alert("Schedule failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPublishing(false);
    }
  };

  const detectedMode = files.length > 0 ? detectMode(files) : null;
  const modeInfo = detectedMode ? MODE_LABELS[detectedMode] : null;
  const isProcessing = currentJob?.status === "processing" || currentJob?.status === "queued";

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
            <p className="text-xs text-zinc-400 mt-0.5">Drop recordings here — auto-captions, stitching, and export.</p>
          </div>
          {files.length > 0 && !isProcessing && (
            <button onClick={clearAll} className="text-xs text-zinc-400 hover:text-red-500 cursor-pointer">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Server status banner */}
      <div className={`px-5 py-2 flex items-center justify-between text-xs ${
        serverStatus === "running" ? "bg-green-50 text-green-700" :
        serverStatus === "stopped" ? "bg-amber-50 text-amber-700" :
        "bg-zinc-50 text-zinc-500"
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            serverStatus === "running" ? "bg-green-500 animate-pulse" :
            serverStatus === "stopped" ? "bg-amber-400" :
            "bg-zinc-300"
          }`} />
          <span className="font-medium">
            {serverStatus === "running" && "Pipeline server online"}
            {serverStatus === "stopped" && "Pipeline server offline"}
            {serverStatus === "unknown" && "Checking server..."}
          </span>
        </div>
        {serverStatus === "running" && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleRestartServer}
              className="text-zinc-600 hover:text-zinc-900 font-semibold cursor-pointer"
              title="Restart the server (LaunchAgent auto-restarts after shutdown)"
            >
              Restart
            </button>
            <button
              onClick={handleStopServer}
              className="text-red-500 hover:text-red-600 font-semibold cursor-pointer"
              title="Stop the local pipeline server"
            >
              Stop
            </button>
          </div>
        )}
        {serverStatus === "stopped" && (
          <button
            onClick={handleRestartServer}
            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-[11px] font-semibold px-2 py-1 rounded cursor-pointer"
            title="Restart the server (takes ~15 seconds)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restart Server
          </button>
        )}
      </div>

      {/* Drop area OR processing state */}
      {isProcessing ? (
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <svg className="animate-spin h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </div>
            <p className="text-xs text-zinc-500 mt-1">{currentJob?.step || "Starting..."}</p>
          </div>
          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${currentJob?.progress || 0}%` }}
            />
          </div>
          <p className="text-right text-xs text-zinc-400 mt-1">{currentJob?.progress || 0}%</p>
        </div>
      ) : currentJob?.status === "complete" ? (
        <div className="p-5">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-900">Video processed!</p>
            <p className="text-xs text-zinc-500">Captions burned in, ready to publish.</p>
          </div>

          {publishResults ? (
            <div className="space-y-2 mb-4">
              {Object.entries(publishResults).map(([key, result]) => {
                const label =
                  key === "video"
                    ? `Video → ${(result.platforms || []).join(" + ") || "—"}`
                    : key === "x"
                      ? "Tweets (X)"
                      : key === "carousel"
                        ? "Carousel → Instagram"
                        : key.toUpperCase();
                const slotLabel = result.scheduled
                  ? result.scheduledDate && result.scheduledTime
                    ? `Scheduled ${result.scheduledDate} at ${result.scheduledTime} EDT`
                    : "Scheduled"
                  : null;
                return (
                  <div key={key} className={`px-3 py-2 rounded-lg border text-xs ${
                    result.success ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{result.success ? "✓" : "✗"} {label}</span>
                      {result.url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">
                          View post →
                        </a>
                      )}
                    </div>
                    {slotLabel && <div className="text-[11px] mt-1 opacity-80">{slotLabel}</div>}
                    {result.error && <div className="text-[11px] mt-1 opacity-80">{result.error.slice(0, 120)}</div>}
                  </div>
                );
              })}
            </div>
          ) : publishPayload ? (
            <>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Schedule to:</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {[
                  { key: "youtube", label: "YouTube", color: "red" },
                  { key: "x", label: "X (Tweets)", color: "zinc" },
                  { key: "instagram", label: "Instagram Reels", color: "purple" },
                  { key: "tiktok", label: "TikTok", color: "pink" },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      selectedPlatforms.has(p.key)
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {selectedPlatforms.has("tiktok") && (
                <div className="mb-3 rounded-lg border border-pink-200 bg-pink-50/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-pink-700">
                      Post to TikTok
                    </span>
                    {tiktokInfoLoading && (
                      <span className="text-[11px] text-zinc-500">loading creator settings…</span>
                    )}
                  </div>

                  {tiktokInfoError ? (
                    <div className="text-xs text-red-600">
                      Couldn&apos;t load TikTok options: {tiktokInfoError}. Reconnect TikTok or
                      uncheck the platform to continue.
                    </div>
                  ) : tiktokInfo ? (
                    <div className="space-y-3">
                      {/* Creator identity */}
                      <div className="flex items-center gap-2">
                        {tiktokInfo.creatorAvatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tiktokInfo.creatorAvatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-full border border-zinc-200"
                          />
                        )}
                        <div className="text-xs text-zinc-700">
                          <div className="font-semibold">{tiktokInfo.creatorNickname}</div>
                          <div className="text-zinc-500">@{tiktokInfo.creatorUsername}</div>
                        </div>
                      </div>

                      {/* Caption preview — exactly what posts to TikTok */}
                      <div>
                        <div className="text-[11px] font-semibold text-zinc-600 mb-1">
                          Caption preview
                        </div>
                        <div className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 whitespace-pre-wrap break-words min-h-[2.5rem]">
                          {publishPayload?.tiktokCaption || (
                            <span className="text-zinc-400">No caption set</span>
                          )}
                        </div>
                      </div>

                      {/* Privacy selector — populated from creator_info */}
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-600 mb-1 block">
                          Who can view this video
                        </label>
                        <select
                          value={tiktokPrivacy}
                          onChange={(e) => setTiktokPrivacy(e.target.value)}
                          className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800"
                        >
                          {tiktokInfo.privacyLevelOptions.map((p) => {
                            const disabled =
                              tiktokDisclose && tiktokBrandedContent && p === "SELF_ONLY";
                            const label =
                              p === "PUBLIC_TO_EVERYONE"
                                ? "Public"
                                : p === "MUTUAL_FOLLOW_FRIENDS"
                                  ? "Friends"
                                  : p === "FOLLOWER_OF_CREATOR"
                                    ? "Followers"
                                    : p === "SELF_ONLY"
                                      ? "Only me"
                                      : p;
                            return (
                              <option key={p} value={p} disabled={disabled}>
                                {label}
                                {disabled ? " — not allowed for branded content" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Interaction toggles */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            label: "Comment",
                            disabled: tiktokInfo.commentDisabled,
                            value: tiktokDisableComment,
                            set: setTiktokDisableComment,
                          },
                          {
                            label: "Duet",
                            disabled: tiktokInfo.duetDisabled,
                            value: tiktokDisableDuet,
                            set: setTiktokDisableDuet,
                          },
                          {
                            label: "Stitch",
                            disabled: tiktokInfo.stitchDisabled,
                            value: tiktokDisableStitch,
                            set: setTiktokDisableStitch,
                          },
                        ].map((t) => (
                          <label
                            key={t.label}
                            className={`flex items-center gap-1.5 text-[11px] ${t.disabled ? "opacity-50" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={t.disabled || t.value}
                              disabled={t.disabled}
                              onChange={(e) => t.set(e.target.checked)}
                              className="cursor-pointer"
                            />
                            <span className="text-zinc-700">Disable {t.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Disclose post content */}
                      <div className="border-t border-pink-200 pt-3">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tiktokDisclose}
                            onChange={(e) => {
                              setTiktokDisclose(e.target.checked);
                              if (!e.target.checked) {
                                setTiktokBrandedContent(false);
                                setTiktokYourBrand(false);
                              }
                            }}
                            className="mt-0.5 cursor-pointer"
                          />
                          <div className="text-[11px] text-zinc-700">
                            <div className="font-semibold">Disclose post content</div>
                            <div className="text-zinc-500">
                              Turn on to disclose that this video promotes goods or services in
                              exchange for something of value. Your video could promote yourself,
                              a third party, or both.
                            </div>
                          </div>
                        </label>

                        {tiktokDisclose && (
                          <div className="mt-2 ml-5 space-y-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tiktokYourBrand}
                                onChange={(e) => setTiktokYourBrand(e.target.checked)}
                                className="mt-0.5 cursor-pointer"
                              />
                              <div className="text-[11px] text-zinc-700">
                                <div className="font-semibold">Your brand</div>
                                <div className="text-zinc-500">
                                  You are promoting yourself or your own business. This video will
                                  be classified as Brand Organic.
                                </div>
                              </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tiktokBrandedContent}
                                onChange={(e) => setTiktokBrandedContent(e.target.checked)}
                                className="mt-0.5 cursor-pointer"
                              />
                              <div className="text-[11px] text-zinc-700">
                                <div className="font-semibold">Branded content</div>
                                <div className="text-zinc-500">
                                  You are promoting another brand or a third party. This video
                                  will be classified as Branded Content.
                                </div>
                              </div>
                            </label>
                            {!tiktokBrandedContent && !tiktokYourBrand && (
                              <div className="text-[11px] text-amber-700">
                                Pick at least one to disclose, or turn off the disclosure toggle.
                              </div>
                            )}
                            <div className="text-[10px] text-zinc-500 leading-snug">
                              {tiktokBrandedContent
                                ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation."
                                : "By posting, you agree to TikTok's Music Usage Confirmation."}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : null}

          <div className="flex gap-2">
            <button onClick={downloadOutput} className="flex-1 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-sm font-medium rounded-lg cursor-pointer">
              Download
            </button>
            {publishPayload && !publishResults && (
              <button
                onClick={handlePublish}
                disabled={publishing || selectedPlatforms.size === 0 || tiktokCompliancePending}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {publishing ? "Scheduling…" : "Schedule"}
              </button>
            )}
            {/* Retry button when Schedule failed on at least one surface.
                Re-uses the same processed job (currentJob) so the video
                doesn't re-process from scratch. */}
            {publishPayload && publishResults && Object.values(publishResults).some((r) => !r.success) && (
              <button
                onClick={() => { setPublishResults(null); handlePublish(); }}
                disabled={publishing || selectedPlatforms.size === 0 || tiktokCompliancePending}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {publishing ? "Retrying…" : "Retry Schedule"}
              </button>
            )}
            <button onClick={clearAll} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg cursor-pointer">
              Reset
            </button>
          </div>
        </div>
      ) : currentJob?.status === "failed" ? (
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-900 mb-1">Processing failed</p>
          <p className="text-xs text-red-500 mb-4">{currentJob.error}</p>
          <button onClick={clearAll} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg cursor-pointer">
            Try Again
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`mx-4 mt-4 mb-2 rounded-xl border-2 border-dashed transition-colors ${
            isDragging ? "border-green-400 bg-green-50" : "border-zinc-300 bg-zinc-50"
          }`}
        >
          {files.length === 0 ? (
            <label className="flex flex-col items-center justify-center py-10 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mb-3 ${isDragging ? "text-green-400" : "text-zinc-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-zinc-500">{isDragging ? "Drop files here" : "Drag & drop video files here"}</p>
              <p className="text-xs text-zinc-400 mt-1">MP4, MKV, MOV, or audio files</p>
              <p className="text-xs text-green-600 font-medium mt-2">or click to browse</p>
              <input type="file" accept="video/*,audio/*" multiple onChange={handleFileInput} className="hidden" />
            </label>
          ) : (
            <div className="p-4">
              {modeInfo && (
                <div className={`mb-3 px-3 py-2 rounded-lg border text-xs font-medium ${modeInfo.color}`}>
                  {modeInfo.label} — {modeInfo.description}
                </div>
              )}
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
      )}

      {/* Process button */}
      {files.length > 0 && !isProcessing && !currentJob && (
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={handleProcess}
            disabled={serverStatus !== "running"}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm cursor-pointer"
          >
            {serverStatus === "running"
              ? `Process ${files.length} file${files.length > 1 ? "s" : ""} → Generate Output`
              : "Start the pipeline server to process"}
          </button>
        </div>
      )}
    </div>
  );
}
