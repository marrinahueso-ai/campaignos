import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildApprovalContentPreviewHtml,
  buildApprovalContentPreviewText,
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
    assert.match(html, />Caption</);
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
});
