"use client";

import Image from "next/image";
import { CREATE_AI_DEMO } from "../demoData";

/**
 * Static 4:3 artwork preview using the local Back to School Fair asset.
 */
export function ArtworkPreview() {
  const { artwork, labels, event, school } = CREATE_AI_DEMO;

  return (
    <figure className="space-y-2">
      <figcaption className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--cos-muted)] sm:text-xs">
        {labels.artwork}
      </figcaption>
      <div className="relative aspect-[4/3] max-h-36 overflow-hidden border border-[var(--cos-border)] bg-[var(--cos-bg-alt)] sm:max-h-40 md:max-h-44">
        <Image
          src={artwork.src}
          alt={artwork.alt}
          fill
          sizes="(max-width: 768px) 90vw, 360px"
          className="object-cover object-center"
          priority={false}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--cos-text)_55%,transparent)] to-transparent px-3 py-2">
          <p className="text-xs font-medium text-[var(--cos-card)] sm:text-sm">
            {event.title}
          </p>
          <p className="text-[10px] text-[color-mix(in_srgb,var(--cos-card)_85%,transparent)] sm:text-xs">
            {event.date} · {school}
          </p>
        </div>
      </div>
    </figure>
  );
}
