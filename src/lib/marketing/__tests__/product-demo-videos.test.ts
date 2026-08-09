import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
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
      assert.match(
        demo.poster,
        /^\/images\/marketing-home\/posters\/[a-z0-9-]+\.jpg$/,
      );
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

  it("homepage Product Tour mounts all six demos via selectable steps", () => {
    const tour = readFileSync(
      new URL(
        "../../../components/marketing-wow/MarketingProductTour.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const home = readFileSync(
      new URL(
        "../../../components/marketing-wow/MarketingWowHome.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(home, /MarketingProductTour/);
    assert.doesNotMatch(home, /ScreenshotPeekCard/);
    assert.match(home, /aspect-\[1960\/1080\]/);
    assert.match(home, /demoId="dashboard"/);

    for (const id of [
      "calendar",
      "event-planning",
      "create-with-ai",
      "approvals",
      "volunteers",
      "dashboard",
    ]) {
      assert.match(tour, new RegExp(`id: "${id}"`));
    }

    assert.match(tour, /DEFAULT_STEP.*=.*"create-with-ai"/);
    assert.match(tour, /See the school year in one place/);
    assert.match(tour, /Turn an event into ready-to-share communications/);
    assert.doesNotMatch(tour, /quiet ops studio/);
    assert.doesNotMatch(tour, /ops coach/);
  });
});
