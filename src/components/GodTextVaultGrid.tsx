"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { upload } from "@vercel/blob/client";

type VaultKind = "rizz" | "ui-refs" | "hype-clips" | "music" | "intro-audio" | "hook-backgrounds" | "baddie-photos";

type VaultRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

interface VaultGridProps {
  kind: VaultKind;
  title: string;
  description: string;
  /** Start collapsed — click header to expand. */
  defaultCollapsed?: boolean;
}

const KIND_CONFIG: Record<
  VaultKind,
  {
    route: string;
    urlField: string;
    accept: string;
    accentClass: string;
    extraFields?: { name: string; key: string; options: string[] }[];
  }
> = {
  rizz: {
    route: "/api/godtext/rizz-vault",
    urlField: "Image URL",
    accept: "image/png,image/jpeg,image/webp",
    accentClass: "border-rose-200 bg-rose-50/40",
  },
  "ui-refs": {
    route: "/api/godtext/ui-refs",
    urlField: "Image URL",
    accept: "image/png,image/jpeg,image/webp",
    accentClass: "border-indigo-200 bg-indigo-50/40",
    extraFields: [
      {
        name: "Platform",
        key: "platform",
        options: ["Hinge", "Instagram", "Tinder", "Bumble", "iMessage"],
      },
    ],
  },
  "hype-clips": {
    route: "/api/godtext/hype-clips",
    urlField: "Video URL",
    accept: "video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp,image/gif",
    accentClass: "border-amber-200 bg-amber-50/40",
    extraFields: [
      {
        name: "Type",
        key: "clipType",
        options: ["Hype Clip", "Meme"],
      },
    ],
  },
  music: {
    route: "/api/godtext/music",
    urlField: "Audio URL",
    accept: "audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,audio/aac",
    accentClass: "border-violet-200 bg-violet-50/40",
  },
  "intro-audio": {
    route: "/api/godtext/intro-audio",
    urlField: "Audio URL",
    accept: "audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,audio/aac",
    accentClass: "border-orange-200 bg-orange-50/40",
  },
  "hook-backgrounds": {
    route: "/api/godtext/hook-backgrounds",
    urlField: "Video URL",
    accept: "video/mp4,video/quicktime,video/webm",
    accentClass: "border-cyan-200 bg-cyan-50/40",
  },
  "baddie-photos": {
    route: "/api/godtext/baddie-photos",
    urlField: "Image URL",
    accept: "image/png,image/jpeg,image/webp",
    accentClass: "border-pink-200 bg-pink-50/40",
  },
};

/**
 * Generic vault grid for the GodText AI tab. Drag-drop or click-to-upload
 * goes through @vercel/blob/client.upload (handled by /api/godtext/blob/upload)
 * for the bytes, then a follow-up POST to the kind-specific Airtable route
 * to register the record.
 *
 * Each tile renders a kind-appropriate preview (img / video / audio player)
 * with a delete button that cleans up both the blob and the Airtable row.
 */
export default function GodTextVaultGrid({ kind, title, description, defaultCollapsed = false }: VaultGridProps) {
  const config = KIND_CONFIG[kind];
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(config.route, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRecords(data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [config.route]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      // If extras are required (Platform for ui-refs), make sure they're set
      // before uploading — surface the requirement instead of silently
      // dropping the file.
      const missingExtra = (config.extraFields || []).find(
        (f) => !extraValues[f.key],
      );
      if (missingExtra) {
        setError(`Pick a ${missingExtra.name} before uploading.`);
        return;
      }
      setUploading(true);
      setError(null);
      try {
        for (const file of list) {
          const blob = await upload(`godtext/${kind}/${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/godtext/blob/upload",
          });
          // Register the new record in Airtable.
          const body: Record<string, unknown> = { name: file.name };
          if (kind === "rizz" || kind === "ui-refs" || kind === "baddie-photos") body.imageUrl = blob.url;
          if (kind === "hype-clips" || kind === "hook-backgrounds") body.mediaUrl = blob.url;
          if (kind === "music" || kind === "intro-audio") body.audioUrl = blob.url;
          for (const ef of config.extraFields || []) {
            body[ef.key] = extraValues[ef.key];
          }
          const res = await fetch(config.route, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `HTTP ${res.status}`);
          }
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [kind, config, extraValues, refresh],
  );

  const handleDelete = useCallback(
    async (rec: VaultRecord) => {
      if (!confirm("Delete this entry?")) return;
      const url = rec.fields[config.urlField] as string | undefined;
      const params = new URLSearchParams({ id: rec.id });
      if (url) params.set("url", url);
      try {
        const res = await fetch(`${config.route}?${params.toString()}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        setRecords((prev) => prev.filter((r) => r.id !== rec.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [config.route, config.urlField],
  );

  return (
    <div className={`rounded-xl border ${config.accentClass} p-4`}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-start justify-between w-full text-left cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-900">
            {title}
            <span className="ml-1.5 text-zinc-400 font-normal">
              {collapsed ? "▸" : "▾"}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        <div className="text-[11px] text-zinc-500 font-medium shrink-0 ml-3">
          {records.length} {records.length === 1 ? "item" : "items"}
        </div>
      </button>

      {collapsed ? null : <div className="mt-3">

      {/* Extra-field selectors (Platform for ui-refs, Mood for music) */}
      {config.extraFields && config.extraFields.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {config.extraFields.map((ef) => (
            <div key={ef.key} className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-600">
                {ef.name}:
              </span>
              <select
                value={extraValues[ef.key] || ""}
                onChange={(e) =>
                  setExtraValues((prev) => ({ ...prev, [ef.key]: e.target.value }))
                }
                className="rounded border border-zinc-200 bg-white text-xs px-2 py-1"
              >
                <option value="">— pick —</option>
                {ef.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <label
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="block rounded-lg border-2 border-dashed border-zinc-300 bg-white hover:border-zinc-400 cursor-pointer py-5 text-center mb-4"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="text-xs text-zinc-500">
          {uploading
            ? "Uploading…"
            : "Drop files here or click to browse"}
        </div>
      </label>

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      {/* Compact list for audio/video, small-tile grid for images */}
      {loading ? (
        <div className="text-xs text-zinc-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="text-xs text-zinc-400">Nothing here yet.</div>
      ) : kind === "music" || kind === "intro-audio" || kind === "hype-clips" || kind === "hook-backgrounds" ? (
        <div className="flex flex-col gap-1">
          {records.map((rec) => (
            kind === "music" || kind === "intro-audio" ? (
              <MusicRow
                key={rec.id}
                record={rec}
                onDelete={() => handleDelete(rec)}
              />
            ) : (
              <ClipRow
                key={rec.id}
                record={rec}
                onDelete={() => handleDelete(rec)}
              />
            )
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {records.map((rec) => (
            <VaultTile
              key={rec.id}
              kind={kind}
              record={rec}
              onDelete={() => handleDelete(rec)}
            />
          ))}
        </div>
      )}

    </div>}
    </div>
  );
}

function VaultTile({
  kind,
  record,
  onDelete,
}: {
  kind: VaultKind;
  record: VaultRecord;
  onDelete: () => void;
}) {
  const f = record.fields;
  const name = (f.Name as string | undefined) || "Untitled";
  const url =
    (f["Image URL"] as string | undefined) ||
    (f["Video URL"] as string | undefined) ||
    (f["Audio URL"] as string | undefined) ||
    "";
  const platform = f.Platform as string | undefined;

  return (
    <div className="relative group rounded-lg overflow-hidden border border-zinc-200 bg-white">
      {/* Preview */}
      <div className="aspect-[4/5] bg-zinc-100 flex items-center justify-center overflow-hidden">
        {kind === "rizz" || kind === "ui-refs" || kind === "baddie-photos" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="w-full h-full object-cover" />
        ) : kind === "hype-clips" || kind === "hook-backgrounds" ? (
          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <div className="p-3 flex flex-col items-center justify-center w-full h-full">
            <div className="w-10 h-10 rounded-full bg-violet-200 mb-2 flex items-center justify-center text-violet-700">
              ♪
            </div>
            <audio src={url} controls className="w-full" />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="px-2 py-1.5 text-[11px]">
        <div className="font-medium text-zinc-800 truncate">{name}</div>
        {platform && <div className="text-zinc-500">{platform}</div>}
      </div>

      {/* Delete (visible on hover) */}
      <button
        onClick={onDelete}
        className="absolute top-1 right-1 bg-black/70 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

function MusicRow({
  record,
  onDelete,
}: {
  record: VaultRecord;
  onDelete: () => void;
}) {
  const f = record.fields;
  const name = (f.Name as string | undefined) || "Untitled";
  const url = (f["Audio URL"] as string | undefined) || "";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 group">
      <audio src={url} controls className="h-8 w-48 shrink-0" />
      <span className="text-xs font-medium text-zinc-800 truncate flex-1">{name}</span>
      <button
        onClick={onDelete}
        className="text-zinc-400 hover:text-red-500 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

function ClipRow({
  record,
  onDelete,
}: {
  record: VaultRecord;
  onDelete: () => void;
}) {
  const f = record.fields;
  const name = (f.Name as string | undefined) || "Untitled";
  const url = (f["Video URL"] as string | undefined) || "";
  const clipType = (f["Clip Type"] as string | undefined) || "";
  const isImage = /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 group">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-10 w-16 shrink-0 rounded object-cover bg-zinc-100" />
      ) : (
        <video src={url} className="h-10 w-16 shrink-0 rounded object-cover bg-zinc-100" muted preload="metadata" />
      )}
      <span className="text-xs font-medium text-zinc-800 truncate flex-1">{name}</span>
      {clipType && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
          clipType === "Meme"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {clipType}
        </span>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-400 hover:text-zinc-600 text-[10px] shrink-0"
        title="Preview"
      >
        ▶
      </a>
      <button
        onClick={onDelete}
        className="text-zinc-400 hover:text-red-500 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
