import { escapeHtml, sanitizeHrefUrl } from "@/lib/utils/html";

export type ApprovalEmailContentKind = "social" | "flyer";

export interface ApprovalEmailContentPreview {
  feedArtworkUrl?: string | null;
  storyArtworkUrl?: string | null;
  captionText?: string | null;
  storyCaption?: string | null;
  /** When `flyer`, labels use print-flyer language (no feed/story). */
  contentKind?: ApprovalEmailContentKind | null;
}

/** Resend template vars that switch Social vs Flyer artwork language. */
export function approvalEmailFormatVariables(isFlyer: boolean): {
  ARTWORK_SUMMARY: string;
  CTA_LABEL: string;
} {
  if (isFlyer) {
    return {
      ARTWORK_SUMMARY: "Print flyer",
      CTA_LABEL: "Open Flyer composer",
    };
  }
  return {
    ARTWORK_SUMMARY: "1:1 feed · 9:16 story",
    CTA_LABEL: "Edit artwork",
  };
}

function artworkBlock(
  url: string | null | undefined,
  label: string,
  alt: string,
  width: number,
): string {
  const trimmed = url?.trim();
  if (!trimmed) {
    return "";
  }

  return `
    <div style="display:inline-block;vertical-align:top;margin:0 10px 14px 0;max-width:100%;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">${escapeHtml(label)}</p>
      <a href="${escapeHtml(sanitizeHrefUrl(trimmed))}" style="display:block;text-decoration:none;">
        <img
          src="${escapeHtml(trimmed)}"
          alt="${escapeHtml(alt)}"
          width="${width}"
          style="display:block;width:${width}px;max-width:100%;height:auto;border-radius:12px;border:1px solid #ddd4c8;"
        />
      </a>
    </div>
  `;
}

function captionBlock(label: string, text: string): string {
  return `
    <div style="margin:0 0 14px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c554c;font-weight:600;">${escapeHtml(label)}</p>
      <div style="background:#fffcf7;border:1px solid #ddd4c8;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.55;color:#2a2622;white-space:pre-wrap;">${escapeHtml(text)}</div>
    </div>
  `;
}

/** Shared artwork + caption block for approval and schedule emails. */
export function buildApprovalContentPreviewHtml(
  input: ApprovalEmailContentPreview,
): string {
  const isFlyer = input.contentKind === "flyer";

  if (isFlyer) {
    const flyer = artworkBlock(
      input.feedArtworkUrl,
      "Flyer artwork",
      "Print flyer preview",
      240,
    );
    const copy = input.captionText?.trim() || "";
    const captions = copy ? captionBlock("On-flyer copy", copy) : "";
    if (!flyer && !captions) {
      return "";
    }
    return `
    <div style="margin:20px 0 8px;padding:18px 0 4px;border-top:1px solid #ddd4c8;">
      ${flyer ? `<div style="margin:0 0 4px;">${flyer}</div>` : ""}
      ${captions}
    </div>
  `;
  }

  const feed = artworkBlock(
    input.feedArtworkUrl,
    "Feed artwork",
    "Feed artwork preview",
    240,
  );
  const story = artworkBlock(
    input.storyArtworkUrl,
    "Story artwork",
    "Story artwork preview",
    160,
  );

  const feedCaption = input.captionText?.trim() || "";
  const storyCaption = input.storyCaption?.trim() || "";

  let captions = "";
  if (feedCaption && storyCaption && feedCaption !== storyCaption) {
    captions =
      captionBlock("Feed caption", feedCaption) +
      captionBlock("Story caption", storyCaption);
  } else {
    const single = feedCaption || storyCaption;
    if (single) {
      captions = captionBlock("Caption", single);
    }
  }

  if (!feed && !story && !captions) {
    return "";
  }

  return `
    <div style="margin:20px 0 8px;padding:18px 0 4px;border-top:1px solid #ddd4c8;">
      ${feed || story ? `<div style="margin:0 0 4px;">${feed}${story}</div>` : ""}
      ${captions}
    </div>
  `;
}

export function buildApprovalContentPreviewText(
  input: ApprovalEmailContentPreview,
): string {
  const isFlyer = input.contentKind === "flyer";
  const parts: string[] = [];

  if (isFlyer) {
    if (input.feedArtworkUrl?.trim()) {
      parts.push(`Flyer artwork: ${input.feedArtworkUrl.trim()}`);
    }
    const copy = input.captionText?.trim() || "";
    if (copy) {
      parts.push(`On-flyer copy:\n${copy}`);
    }
    return parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
  }

  if (input.feedArtworkUrl?.trim()) {
    parts.push(`Feed artwork: ${input.feedArtworkUrl.trim()}`);
  }
  if (input.storyArtworkUrl?.trim()) {
    parts.push(`Story artwork: ${input.storyArtworkUrl.trim()}`);
  }

  const feedCaption = input.captionText?.trim() || "";
  const storyCaption = input.storyCaption?.trim() || "";
  if (feedCaption && storyCaption && feedCaption !== storyCaption) {
    parts.push(`Feed caption:\n${feedCaption}`);
    parts.push(`Story caption:\n${storyCaption}`);
  } else {
    const single = feedCaption || storyCaption;
    if (single) {
      parts.push(`Caption:\n${single}`);
    }
  }

  return parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
}
