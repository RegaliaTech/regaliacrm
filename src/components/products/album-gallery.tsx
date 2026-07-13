"use client";

import * as React from "react";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImageView } from "@/lib/view-types";

export function AlbumGallery({
  images,
  cover,
  name,
}: {
  images: ProductImageView[];
  cover: string | null;
  name: string;
}) {
  const photos = images.length
    ? images
    : cover
      ? [{ id: "cover", url: cover, caption: null, position: 0 }]
      : [];

  const [active, setActive] = React.useState(0);
  const [lightbox, setLightbox] = React.useState(false);

  const go = React.useCallback(
    (dir: number) => {
      setActive((i) => (i + dir + photos.length) % photos.length);
    },
    [photos.length],
  );

  React.useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
        <ImageIcon className="h-12 w-12" />
      </div>
    );
  }

  const current = photos[active];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.caption ?? name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {current.caption && (
          <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-left text-sm font-medium text-white">
            {current.caption}
          </span>
        )}
      </button>

      {photos.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg ring-2 transition-all ${
                i === active
                  ? "ring-[var(--primary)]"
                  : "ring-transparent hover:ring-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? `${name} ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <figure
            className="max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.caption ?? name}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            {current.caption && (
              <figcaption className="mt-3 text-center text-sm text-white/80">
                {current.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </div>
  );
}
