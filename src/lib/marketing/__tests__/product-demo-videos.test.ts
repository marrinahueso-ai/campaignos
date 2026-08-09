import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { MARKETING_PRODUCT_DEMOS } from "../product-demo-videos.ts";

describe("marketing product demo videos", () => {
  it("registers all six final demos with clean production paths", () => {
    assert.deepEqual(Object.keys(MARKETING_PRODUCT_DEMOS).sort(), [
      "approvals",
      "calendar",
      "create-with-ai",
      "dashboard",
      "event-planning",
      "volunteers",
    ]);

    for (const demo of Object.values(MARKETING_PRODUCT_DEMOS)) {
      assert.match(demo.src, /^\/videos\/marketing\/[a-z0-9-]+\.mp4$/);
      assert.match(demo.poster, /^\/images\/marketing-home\/posters\/[a-z0-9-]+\.jpg$/);
      assert.ok(demo.label.length > 20);
    }
  });

  it("has on-disk video and poster assets for every demo", () => {
    const root = resolve(process.cwd(), "public");
    for (const demo of Object.values(MARKETING_PRODUCT_DEMOS)) {
      assert.ok(
        existsSync(resolve(root, demo.src.slice(1))),
        `missing ${demo.src}`,
      );
      assert.ok(
        existsSync(resolve(root, demo.poster.slice(1))),
        `missing ${demo.poster}`,
      );
    }
  });

  it("wires product demos into Features stories without inventing sections", () => {
    const source = readFileSync(
      new URL("../features-in-action.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /productDemoId: "create-with-ai"/);
    assert.match(source, /productDemoId: "calendar"/);
    assert.match(source, /productDemoId: "approvals"/);
    assert.match(source, /productDemoId: "volunteers"/);
  });
});
