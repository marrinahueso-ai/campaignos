import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("../../../components/playbooks/PlaybookEditor.tsx", import.meta.url),
  "utf8",
);

describe("PlaybookEditor timing UX", () => {
  it("uses the timing catalog select and build-from-timings picker", () => {
    assert.match(source, /timing-catalog/);
    assert.match(source, /Build from timings/);
    assert.match(source, /Add selected/);
    assert.match(source, /label="Timing"/);
    assert.match(source, /TIMING_CATALOG_CUSTOM_VALUE/);
    assert.doesNotMatch(source, /label="Relative Day"/);
  });
});
