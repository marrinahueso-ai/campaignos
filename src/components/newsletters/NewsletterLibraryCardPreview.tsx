"use client";

import { exportNewsletterPreviewFragment } from "@/lib/newsletter-composer/export-html";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";

/** Email content width used when scaling into the card thumbnail. */
const PREVIEW_SOURCE_WIDTH = 560;
/** Fits ~220px-tall preview windows across the 3-column library grid. */
const PREVIEW_SCALE = 0.4;

/**
 * Miniature newsletter thumbnail for Library cards.
 * Renders the same saved composer HTML as the desktop email preview —
 * scaled and cropped to the top of the issue (no duplicate preview store).
 */
export function NewsletterLibraryCardPreview({
  state,
  className,
}: {
  state: NewsletterComposerState;
  className?: string;
}) {
  const fragment = exportNewsletterPreviewFragment(state);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-[#e8e4dc]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{
          width: PREVIEW_SOURCE_WIDTH,
          transform: `scale(${PREVIEW_SCALE})`,
        }}
        aria-hidden
      >
        <div
          className="bg-white px-4 py-3 shadow-sm [&_a]:pointer-events-none"
          dangerouslySetInnerHTML={{ __html: fragment }}
        />
      </div>
    </div>
  );
}
