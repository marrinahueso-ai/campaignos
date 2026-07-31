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

/**
 * Variables for approval Resend templates — includes pre-rendered image HTML
 * so {{{ARTWORK_PREVIEW_HTML}}} shows real thumbnails (not just format labels).
 */
export function buildApprovalEmailArtworkVariables(input: {
  isFlyer: boolean;
  feedArtworkUrl?: string | null;
  storyArtworkUrl?: string | null;
  captionText?: string | null;
  storyCaption?: string | null;
  /** Overrides default CTA (e.g. Review approval vs Edit artwork). */
  ctaLabel?: string;
}): {
  ARTWORK_SUMMARY: string;
  CTA_LABEL: string;
  ARTWORK_PREVIEW_HTML: string;
} {
  const format = approvalEmailFormatVariables(input.isFlyer);
  return {
    ARTWORK_SUMMARY: format.ARTWORK_SUMMARY,
    CTA_LABEL: input.ctaLabel ?? format.CTA_LABEL,
    ARTWORK_PREVIEW_HTML: buildApprovalContentPreviewHtml({
      feedArtworkUrl: input.feedArtworkUrl,
      storyArtworkUrl: input.storyArtworkUrl,
      captionText: input.captionText,
      storyCaption: input.storyCaption,
      contentKind: input.isFlyer ? "flyer" : "social",
    }),
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
  const safeHref = escapeHtml(sanitizeHrefUrl(trimmed));
  const safeSrc = escapeHtml(trimmed);
  const safeAlt = escapeHtml(alt);
  const safeLabel = escapeHtml(label);

  // Table-based for Resend / Outlook; absolute img URLs only.
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;vertical-align:top;margin-top:0;margin-right:10px;margin-bottom:12px;margin-left:0;">
      <tr>
        <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;letter-spacing:1px;text-transform:uppercase;color:#5c554c;font-weight:700;padding-bottom:8px;">
          ${safeLabel}
        </td>
      </tr>
      <tr>
        <td>
          <a href="${safeHref}" style="text-decoration:none;">
            <img
              src="${safeSrc}"
              alt="${safeAlt}"
              width="${width}"
              border="0"
              style="display:block;width:${width}px;max-width:100%;height:auto;border-radius:12px;border:1px solid #ddd4c8;"
            />
          </a>
        </td>
      </tr>
    </table>
  `;
}

function captionBlock(label: string, text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;">
      <tr>
        <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;letter-spacing:1px;text-transform:uppercase;color:#5c554c;font-weight:700;padding-bottom:8px;">
          ${escapeHtml(label)}
        </td>
      </tr>
      <tr>
        <td bgcolor="#fffcf7" style="background-color:#fffcf7;border:1px solid #ddd4c8;border-radius:12px;padding-top:14px;padding-right:16px;padding-bottom:14px;padding-left:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#2a2622;white-space:pre-wrap;">
          ${escapeHtml(text)}
        </td>
      </tr>
    </table>
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
      <tr>
        <td>
          ${flyer}
          ${captions}
        </td>
      </tr>
    </table>
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
      <tr>
        <td>
          ${feed}${story}
          ${captions}
        </td>
      </tr>
    </table>
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
