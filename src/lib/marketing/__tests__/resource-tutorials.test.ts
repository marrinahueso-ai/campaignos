import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  RESOURCE_TUTORIALS,
  RESOURCE_TUTORIAL_IDS,
  RESOURCE_TUTORIAL_QUERY_PARAM,
  RESOURCE_TUTORIALS_CAPTIONS_STATUS,
  getResourceTutorial,
} from "../resource-tutorials.ts";

const root = join(import.meta.dirname, "../../../../");

describe("resource-tutorials registry", () => {
  it("exports create-an-event as the first narrated tutorial", () => {
    assert.ok(RESOURCE_TUTORIAL_IDS.includes("create-an-event"));
    const tutorial = RESOURCE_TUTORIALS["create-an-event"];
    assert.equal(tutorial.title, "Create your first event");
    assert.match(tutorial.description, /event details/i);
    assert.equal(tutorial.src, "/videos/resources/create-an-event-tutorial.mp4");
    assert.equal(
      tutorial.poster,
      "/images/resources/tutorials/create-an-event-tutorial.jpg",
    );
    assert.equal(tutorial.captionsSrc, null);
  });

  it("exports create-with-ai as the second narrated tutorial", () => {
    assert.ok(RESOURCE_TUTORIAL_IDS.includes("create-with-ai"));
    const tutorial = RESOURCE_TUTORIALS["create-with-ai"];
    assert.equal(tutorial.title, "Creating social posts with AI");
    assert.match(tutorial.description, /Create with AI/i);
    assert.equal(tutorial.src, "/videos/resources/create-with-ai-tutorial.mp4");
    assert.equal(
      tutorial.poster,
      "/images/resources/tutorials/create-with-ai-tutorial.jpg",
    );
    assert.equal(tutorial.captionsSrc, null);
  });

  it("exports create-a-flyer as a narrated tutorial", () => {
    assert.ok(RESOURCE_TUTORIAL_IDS.includes("create-a-flyer"));
    const tutorial = RESOURCE_TUTORIALS["create-a-flyer"];
    assert.equal(tutorial.title, "Create a flyer");
    assert.match(tutorial.description, /flyer/i);
    assert.equal(tutorial.src, "/videos/resources/create-a-flyer-tutorial.mp4");
    assert.equal(
      tutorial.poster,
      "/images/resources/tutorials/create-a-flyer-tutorial.jpg",
    );
    assert.equal(tutorial.captionsSrc, null);
  });

  it("exports approvals-scheduling as a narrated tutorial", () => {
    assert.ok(RESOURCE_TUTORIAL_IDS.includes("approvals-scheduling"));
    const tutorial = RESOURCE_TUTORIALS["approvals-scheduling"];
    assert.equal(tutorial.title, "Approving & scheduling content");
    assert.match(tutorial.description, /approves posts/i);
    assert.equal(
      tutorial.src,
      "/videos/resources/approvals-scheduling-tutorial.mp4",
    );
    assert.equal(
      tutorial.poster,
      "/images/resources/tutorials/approvals-scheduling-tutorial.jpg",
    );
    assert.equal(tutorial.captionsSrc, null);
  });

  it("has on-disk video and poster assets for every tutorial", () => {
    for (const id of RESOURCE_TUTORIAL_IDS) {
      const tutorial = RESOURCE_TUTORIALS[id];
      assert.ok(
        existsSync(join(root, "public", tutorial.src.replace(/^\//, ""))),
        `missing video for ${id}: ${tutorial.src}`,
      );
      assert.ok(
        existsSync(join(root, "public", tutorial.poster.replace(/^\//, ""))),
        `missing poster for ${id}: ${tutorial.poster}`,
      );
    }
  });

  it("resolves tutorials by id and documents captions status", () => {
    assert.equal(getResourceTutorial("create-an-event")?.id, "create-an-event");
    assert.equal(getResourceTutorial("create-with-ai")?.id, "create-with-ai");
    assert.equal(getResourceTutorial("create-a-flyer")?.id, "create-a-flyer");
    assert.equal(
      getResourceTutorial("approvals-scheduling")?.id,
      "approvals-scheduling",
    );
    assert.equal(getResourceTutorial("missing"), null);
    assert.equal(RESOURCE_TUTORIAL_QUERY_PARAM, "tutorial");
    assert.match(RESOURCE_TUTORIALS_CAPTIONS_STATUS, /No caption/i);
  });
});
