"use client";

import * as React from "react";
import { Upload, X, Star, Loader2 } from "lucide-react";

export type AlbumImage = { url: string; caption: string };

export function ImageUploader({
  value,
  onChange,
}: {
  value: AlbumImage[];
  onChange: (images: AlbumImage[]) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const next: AlbumImage[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        next.push({ url: json.url, caption: "" });
      }
      onChange([...value, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function makeCover(i: number) {
    if (i === 0) return;
    const reordered = [value[i], ...value.filter((_, idx) => idx !== i)];
    onChange(reordered);
  }

  function setCaption(i: number, caption: string) {
    onChange(value.map((img, idx) => (idx === i ? { ...img, caption } : img)));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-slate-50 px-4 py-8 text-sm text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Upload className="h-6 w-6" />
        )}
        <span className="font-medium">
          {uploading ? "Uploading…" : "Click to upload images"}
        </span>
        <span className="text-xs">JPG, PNG, WEBP or GIF · max 5MB each</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((img, i) => (
            <div
              key={img.url}
              className="group relative overflow-hidden rounded-xl border border-[var(--border)]"
            >
              <div className="relative aspect-square bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption || `Image ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-white">
                    <Star className="h-3 w-3 fill-white" /> Cover
                  </span>
                )}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(i)}
                      title="Set as cover"
                      className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    title="Remove"
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-[var(--danger)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <input
                value={img.caption}
                onChange={(e) => setCaption(i, e.target.value)}
                placeholder="Caption…"
                className="w-full border-0 border-t border-[var(--border)] px-2.5 py-1.5 text-xs outline-none focus:ring-0"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
