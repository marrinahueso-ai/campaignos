"use client";

import { tryExportNewsletterPreviewFragment } from "@/lib/newsletter-composer/export-html";
import {
  NEWSLETTER_LIBRARY_PREVIEW_SOURCE_WIDTH,
  newsletterLibraryPreviewScale,
} from "@/lib/newsletter/library-card-preview";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Miniature newsletter thumbnail for Library cards.
 * Renders the same saved composer HTML as the desktop email preview,
 * scaled to fill the card (no gray side bands).
 * Never throws — a bad snapshot must not blank the Library page.
 */
export function NewsletterLibraryCardPreview({
  state,
  className,
}: {
  state: NewsletterComposerState | null | undefined;
  className?: string;
}) {
  const fragment = tryExportNewsletterPreviewFragment(state);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    if (!fragment) return;
    const node = frameRef.current;
    if (!node) return;

    const update = () => {
      const width = frameRef.current?.clientWidth ?? 0;
      setScale(newsletterLibraryPreviewScale(width));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [fragment]);

  if (!fragment) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-[#e8e4dc]",
          className,
        )}
      >
        <p className="px-4 text-center text-xs text-cos-muted">No preview yet</p>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className={cn("relative isolate overflow-hidden bg-white", className)}
    >
      {scale > 0 ? (
        <div
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{
            width: NEWSLETTER_LIBRARY_PREVIEW_SOURCE_WIDTH,
            transform: `scale(${scale})`,
          }}
          aria-hidden
        >
          <div
            className="bg-white [&_a]:pointer-events-none"
            dangerouslySetInnerHTML={{ __html: fragment }}
          />
        </div>
      ) : null}
    </div>
  );
}
