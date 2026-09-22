"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ImagePlus,
  Link2,
  Loader2,
  Trash2,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";

type SingleProps = {
  mode?: "single";
  /** Form field name for the single image URL. */
  name?: string;
  label?: string;
  defaultValue?: string;
  /** R2 key prefix, e.g. "medications" or "gallery". */
  folder?: string;
  hint?: string;
  required?: boolean;
  /** Fired whenever the single URL changes (upload, paste, or clear). */
  onChange?: (url: string) => void;
};

type MultiProps = {
  mode: "multi";
  /** Form field name for comma-separated URLs. */
  name?: string;
  label?: string;
  defaultValue?: string;
  folder?: string;
  hint?: string;
  required?: boolean;
  /** Max images in the gallery (default 8). */
  max?: number;
  onChange?: (urls: string) => void;
};

type Props = SingleProps | MultiProps;

function parseList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isSupportedImageReference(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (/^\/(?!\/)/.test(raw)) return true;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function uploadFile(
  file: File,
  folder: string,
  onProgress: (pct: number) => void,
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);

    xhr.open("POST", "/api/admin/uploads");
    xhr.responseType = "json";

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      const data = xhr.response as
        | { ok?: boolean; url?: string; message?: string; error?: string }
        | null;
      if (xhr.status >= 200 && xhr.status < 300 && data?.ok && data.url) {
        resolve({ url: data.url });
        return;
      }
      reject(
        new Error(
          data?.message || data?.error || `Upload failed (${xhr.status}).`,
        ),
      );
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(body);
  });
}

export default function ImageUploadField(props: Props) {
  const multi = props.mode === "multi";
  const name = props.name || (multi ? "imageUrls" : "imageUrl");
  const label = props.label || (multi ? "Gallery images" : "Image");
  const folder = props.folder || (multi ? "gallery" : "medications");
  const max = multi ? (props.max ?? 8) : 1;
  const hint =
    props.hint ||
    (multi
      ? "Upload images or paste public URLs (comma-separated)."
      : "Upload to Cloudflare R2 or paste a public image URL.");

  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [urls, setUrls] = useState<string[]>(() =>
    multi
      ? parseList(props.defaultValue)
      : props.defaultValue
        ? [props.defaultValue]
        : [],
  );
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const serialized = multi ? urls.join(", ") : urls[0] || "";
  const canAddMore = multi ? urls.length < max : true;
  const onChange = props.onChange;

  // Notify parent when value changes (skip first paint to avoid loops).
  const skipNotify = useRef(true);
  useEffect(() => {
    if (skipNotify.current) {
      skipNotify.current = false;
      return;
    }
    onChange?.(serialized);
  }, [serialized, onChange]);

  const addUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      setUrls((prev) => {
        if (prev.includes(trimmed)) return prev;
        if (multi) {
          if (prev.length >= max) return prev;
          return [...prev, trimmed];
        }
        return [trimmed];
      });
      setError(null);
    },
    [max, multi],
  );

  const removeAt = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onPickFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setError(null);

      const room = multi ? Math.max(0, max - urls.length) : 1;
      const list = Array.from(files).slice(0, room);
      if (!list.length) {
        setError(`Maximum of ${max} image${max === 1 ? "" : "s"} reached.`);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        for (const file of list) {
          if (!file.type.startsWith("image/")) {
            throw new Error(`"${file.name}" is not an image.`);
          }
          const { url } = await uploadFile(file, folder, setProgress);
          addUrl(url);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploading(false);
        setProgress(0);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [addUrl, folder, max, multi, urls.length],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void onPickFiles(e.dataTransfer.files);
    },
    [onPickFiles],
  );

  function submitUrlDraft() {
    const raw = urlDraft.trim();
    if (!raw) return;
    const candidates = multi ? parseList(raw) : [raw];
    const invalid = candidates.find((value) => !isSupportedImageReference(value));
    if (invalid) {
      setError("Use an http(s) image URL or a site-relative path beginning with /.");
      return;
    }
    for (const candidate of candidates) addUrl(candidate);
    setUrlDraft("");
    setShowUrlInput(false);
  }

  const actionButtons = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={uploading || !canAddMore}
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-panel)] px-3 py-1.5 text-xs font-medium admin-muted transition hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)] disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {uploading
          ? `Uploading ${progress}%`
          : multi
            ? "Upload"
            : urls.length
              ? "Replace upload"
              : "Upload"}
      </button>
      <button
        type="button"
        disabled={uploading}
        onClick={() => setShowUrlInput((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-panel)] px-3 py-1.5 text-xs font-medium admin-muted transition hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)] disabled:opacity-50"
      >
        <Link2 className="h-3.5 w-3.5" />
        {urls.length && !multi ? "Change URL" : "Paste URL"}
      </button>
      {!multi && urls.length > 0 && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => setUrls([])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-panel)] px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500/50 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <label className="label-admin" htmlFor={inputId}>
        {label}
        {props.required ? " *" : ""}
      </label>

      {/* Hidden field submitted with the parent form */}
      <input
        type="hidden"
        name={name}
        value={serialized}
        required={Boolean(props.required) && !serialized}
      />

      {/* Shared file input */}
      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        multiple={multi}
        className="hidden"
        onChange={(e) => void onPickFiles(e.target.files)}
      />

      {/* Previews */}
      {urls.length > 0 && (
        <div
          className={`grid gap-2 ${multi ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1"}`}
        >
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="group relative overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Preview ${i + 1}`}
                className={`w-full object-cover ${multi ? "aspect-square" : "aspect-video max-h-48"}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0.3";
                }}
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1.5 top-1.5 rounded-lg bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {!multi && (
                <div className="truncate border-t border-[var(--admin-border)] px-2 py-1 text-xs admin-soft">
                  {url}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone when empty (or multi always shows when room left) */}
      {(urls.length === 0 || (multi && canAddMore)) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={onDrop}
          className="rounded-xl border border-dashed border-[var(--admin-border-2)] bg-[var(--admin-inset)]/50 p-4 text-center transition hover:border-[var(--admin-accent)]"
        >
          <ImagePlus className="mx-auto mb-2 h-6 w-6 admin-soft" />
          <p className="text-xs admin-muted">
            Drag &amp; drop {multi ? "images" : "an image"}, or choose a file
          </p>
          <div className="mt-3">{actionButtons}</div>

          {uploading && (
            <div className="mx-auto mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--admin-border)]">
              <div
                className="h-full rounded-full bg-[var(--admin-accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Single mode with existing image: compact actions (no empty drop zone) */}
      {!multi && urls.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">{actionButtons}</div>
          {uploading && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--admin-border)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs admin-soft">{progress}%</span>
            </div>
          )}
        </div>
      )}

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitUrlDraft();
              }
            }}
            placeholder={
              multi
                ? "https://… or comma-separated URLs"
                : "https://cdn.example.com/image.webp"
            }
            className="input-admin flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={submitUrlDraft}
            className="btn-admin !rounded-lg px-3 py-1.5 text-xs"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(false);
              setUrlDraft("");
            }}
            className="rounded-lg border border-[var(--admin-border-2)] px-2 py-1.5 admin-soft hover:text-[var(--admin-text)]"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-400">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs admin-soft">{hint}</p>
    </div>
  );
}
