import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  RESEND_TEMPLATE_VARIABLE_MAX_CHARS,
  buildApprovalContentPreviewHtml,
  buildApprovalContentPreviewText,
  buildApprovalEmailArtworkVariables,
  buildApprovalTransactionalEmail,
} from "@/lib/email/approval-content-preview";

describe("approval content preview", () => {
  it("renders feed/story artwork and caption in html", () => {
    const html = buildApprovalContentPreviewHtml({
      feedArtworkUrl: "https://cdn.example/feed.png",
      storyArtworkUrl: "https://cdn.example/story.png",
      captionText: "Bring snacks Friday!",
      storyCaption: "Bring snacks Friday!",
    });

    assert.match(html, /Feed artwork/);
    assert.match(html, /Story artwork/);
    assert.match(html, /https:\/\/cdn\.example\/feed\.png/);
    assert.match(html, /https:\/\/cdn\.example\/story\.png/);
    assert.match(html, /Bring snacks Friday!/);
    assert.match(html, /Caption/);
  });

  it("shows separate feed and story captions when they differ", () => {
    const html = buildApprovalContentPreviewHtml({
      captionText: "Feed copy",
      storyCaption: "Story copy",
    });

    assert.match(html, /Feed caption/);
    assert.match(html, /Story caption/);
    assert.match(html, /Feed copy/);
    assert.match(html, /Story copy/);
  });

  it("returns empty when no artwork or caption", () => {
    assert.equal(buildApprovalContentPreviewHtml({}), "");
    assert.equal(buildApprovalContentPreviewText({}), "");
  });

  it("includes artwork and caption in plain text", () => {
    const text = buildApprovalContentPreviewText({
      feedArtworkUrl: "https://cdn.example/feed.png",
      captionText: "Hello families",
    });

    assert.match(text, /Feed artwork: https:\/\/cdn\.example\/feed\.png/);
    assert.match(text, /Caption:\nHello families/);
  });

  it("builds full transactional HTML with real img tags (not escaped)", () => {
    const preview = buildApprovalEmailArtworkVariables({
      isFlyer: false,
      feedArtworkUrl: "https://cdn.example/feed.png",
      storyArtworkUrl: "https://cdn.example/story.png",
    });
    const mail = buildApprovalTransactionalEmail({
      categoryLabel: "APPROVAL",
      headline: "Approval assigned to you",
      bodyHtml: "Content is waiting.",
      bodyText: "Content is waiting.",
      previewHeading: "Artwork to review",
      artworkSummary: preview.ARTWORK_SUMMARY,
      artworkPreviewHtml: preview.ARTWORK_PREVIEW_HTML,
      artworkPreviewText: "",
      ctaLabel: "Review approval",
      actionUrl: "https://heyralli.com/approvals",
      footer: "You're receiving this because approvals need your attention.",
    });
    assert.match(mail.html, /<img[\s\S]*src="https:\/\/cdn\.example\/feed\.png"/);
    assert.match(mail.html, /<img[\s\S]*src="https:\/\/cdn\.example\/story\.png"/);
    assert.doesNotMatch(mail.html, /&lt;img/);
  });

  it("builds Resend vars with preview HTML for social and flyer", () => {
    const social = buildApprovalEmailArtworkVariables({
      isFlyer: false,
      feedArtworkUrl: "https://cdn.example/feed.png",
      storyArtworkUrl: "https://cdn.example/story.png",
      ctaLabel: "Review approval",
    });
    assert.equal(social.ARTWORK_SUMMARY, "1:1 feed · 9:16 story");
    assert.equal(social.CTA_LABEL, "Review approval");
    assert.match(social.ARTWORK_PREVIEW_HTML, /src="https:\/\/cdn\.example\/feed\.png"/);
    assert.match(social.ARTWORK_PREVIEW_HTML, /src="https:\/\/cdn\.example\/story\.png"/);

    const flyer = buildApprovalEmailArtworkVariables({
      isFlyer: true,
      feedArtworkUrl: "https://cdn.example/flyer.png",
    });
    assert.equal(flyer.ARTWORK_SUMMARY, "Print flyer");
    assert.match(flyer.ARTWORK_PREVIEW_HTML, /Flyer artwork/);
    assert.doesNotMatch(flyer.ARTWORK_PREVIEW_HTML, /Story artwork/);
  });

  it("uses flyer labels when contentKind is flyer", () => {
    const html = buildApprovalContentPreviewHtml({
      contentKind: "flyer",
      feedArtworkUrl: "https://cdn.example/flyer.png",
      storyArtworkUrl: "https://cdn.example/story.png",
      captionText: "Friday Night Lights",
      storyCaption: "ignored for flyer",
    });
    assert.match(html, /Flyer artwork/);
    assert.match(html, /On-flyer copy/);
    assert.match(html, /Friday Night Lights/);
    assert.doesNotMatch(html, /Feed artwork/);
    assert.doesNotMatch(html, /Story artwork/);

    const text = buildApprovalContentPreviewText({
      contentKind: "flyer",
      feedArtworkUrl: "https://cdn.example/flyer.png",
      captionText: "Friday Night Lights",
    });
    assert.match(text, /Flyer artwork:/);
    assert.match(text, /On-flyer copy:\nFriday Night Lights/);
  });

  it("rejects non-http artwork urls so data/blob never enter email HTML", () => {
    const html = buildApprovalContentPreviewHtml({
      feedArtworkUrl: "data:image/png;base64,AAAA",
      storyArtworkUrl: "blob:https://example/uuid",
      captionText: "ok caption",
    });
    assert.doesNotMatch(html, /data:image/);
    assert.doesNotMatch(html, /blob:/);
    assert.match(html, /ok caption/);
  });

  it("dual artwork preview HTML exceeds Resend template variable limit (regression)", () => {
    // Realistic public storage paths (same shape as prod Supabase event-assets URLs).
    const base =
      "https://example.supabase.co/storage/v1/object/public/event-assets/" +
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/campaign-builder-v2/generated/" +
      "ms-1785209982020-cu3j8/ffffffff-1111-2222-3333-444444444444";
    const preview = buildApprovalEmailArtworkVariables({
      isFlyer: false,
      feedArtworkUrl: `${base}/feed-1.png`,
      storyArtworkUrl: `${base}/story-1.png`,
      captionText:
        "Exciting news, everyone! There will be No School on Labor Day this year, so mark your calendars for Monday, September 7! Enjoy the long weekend with your family and friends.",
    });
    assert.ok(
      preview.ARTWORK_PREVIEW_HTML.length > RESEND_TEMPLATE_VARIABLE_MAX_CHARS,
      `expected preview HTML > ${RESEND_TEMPLATE_VARIABLE_MAX_CHARS}, got ${preview.ARTWORK_PREVIEW_HTML.length}`,
    );
  });

  it("approval notifications send app HTML, not Resend approval templates", () => {
    const source = readFileSync(
      new URL("../../campaign-builder-v2/approval-notifications.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /buildApprovalTransactionalEmail/);
    assert.match(source, /await sendEmail\(/);
    assert.doesNotMatch(source, /templateId:\s*"approval-/);
    assert.doesNotMatch(source, /ARTWORK_PREVIEW_HTML:\s*artwork/);
  });
});
