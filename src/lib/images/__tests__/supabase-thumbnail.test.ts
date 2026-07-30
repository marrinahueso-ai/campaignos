import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSupabaseThumbnailUrl } from "../supabase-thumbnail.ts";

describe("toSupabaseThumbnailUrl", () => {
  it("uses Supabase Image Transformations for public artwork", () => {
    assert.equal(
      toSupabaseThumbnailUrl(
        "https://project.supabase.co/storage/v1/object/public/event-assets/event-1/feed/v1-art.png?version=4",
        { width: 640 },
      ),
      "https://project.supabase.co/storage/v1/render/image/public/event-assets/event-1/feed/v1-art.png?version=4&width=640&quality=72",
    );
  });

  it("caps list artwork at 800px", () => {
    const result = toSupabaseThumbnailUrl(
      "https://project.supabase.co/storage/v1/object/public/event-assets/event-1/feed/v1-art.png",
      { width: 1600, quality: 80 },
    );

    assert.match(result, /width=800/);
    assert.match(result, /quality=80/);
  });

  it("leaves signed, non-Supabase, and invalid URLs unchanged", () => {
    const signed =
      "https://project.supabase.co/storage/v1/object/sign/event-assets/event-1/art.png?token=abc";
    assert.equal(toSupabaseThumbnailUrl(signed, { width: 400 }), signed);
    assert.equal(
      toSupabaseThumbnailUrl("https://cdn.example.com/art.png", { width: 400 }),
      "https://cdn.example.com/art.png",
    );
    assert.equal(toSupabaseThumbnailUrl("not a URL", { width: 400 }), "not a URL");
  });
});
