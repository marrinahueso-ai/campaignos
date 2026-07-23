import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defineDemoSpec } from "../defineDemoSpec";
import { validateDemoSpec } from "../validateDemoSpec";
import type { DemoSpec } from "../types";

function baseSpec(overrides: Partial<DemoSpec> = {}): DemoSpec {
  return {
    id: "sample-demo",
    name: "Sample Demo",
    folderName: "SampleDemo",
    previewLabel: "Sample Demo",
    description: "A sample",
    productArea: "Testing",
    goal: "Validate the generator",
    playback: {
      duration: 20,
      loop: true,
      autoplay: true,
      allowBeatOverlap: false,
    },
    states: {
      startingState: "Start",
      finalState: "Done",
      reducedMotionState: "Show Done immediately",
    },
    beats: [
      {
        id: "start",
        label: "Start",
        start: 0,
        end: 3,
        description: "Hold start",
      },
      {
        id: "finish",
        label: "Finish",
        start: 3,
        end: 18,
        description: "Finish work",
      },
    ],
    content: {},
    responsive: {
      primaryStory: ["Result"],
    },
    ...overrides,
  };
}

describe("validateDemoSpec", () => {
  it("accepts a valid spec", () => {
    const result = validateDemoSpec(baseSpec());
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
  });

  it("rejects duplicate beat ids", () => {
    const result = validateDemoSpec(
      baseSpec({
        beats: [
          {
            id: "start",
            label: "A",
            start: 0,
            end: 2,
            description: "A",
          },
          {
            id: "start",
            label: "B",
            start: 2,
            end: 4,
            description: "B",
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    assert.match(
      result.errors.map((e) => e.message).join("\n"),
      /Duplicate beat id/,
    );
  });

  it("rejects beats that end before they start", () => {
    const result = validateDemoSpec(
      baseSpec({
        beats: [
          {
            id: "bad",
            label: "Bad",
            start: 5,
            end: 4,
            description: "Invalid",
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    assert.match(
      result.errors.map((e) => e.message).join("\n"),
      /end must be greater/,
    );
  });

  it("rejects beats past total duration", () => {
    const result = validateDemoSpec(
      baseSpec({
        beats: [
          {
            id: "late",
            label: "Late",
            start: 18,
            end: 25,
            description: "Too long",
          },
        ],
      }),
    );
    assert.equal(result.ok, false);
    assert.match(
      result.errors.map((e) => e.message).join("\n"),
      /exceeds duration/,
    );
  });

  it("rejects overlapping beats unless allowed", () => {
    const overlapping = baseSpec({
      beats: [
        {
          id: "a",
          label: "A",
          start: 0,
          end: 5,
          description: "A",
        },
        {
          id: "b",
          label: "B",
          start: 3,
          end: 8,
          description: "B",
        },
      ],
    });
    const blocked = validateDemoSpec(overlapping);
    assert.equal(blocked.ok, false);
    assert.match(
      blocked.errors.map((e) => e.message).join("\n"),
      /overlaps/,
    );

    const allowed = validateDemoSpec({
      ...overlapping,
      playback: { ...overlapping.playback, allowBeatOverlap: true },
    });
    assert.equal(allowed.ok, true);
  });

  it("rejects missing reduced-motion state", () => {
    const result = validateDemoSpec(
      baseSpec({
        states: {
          startingState: "Start",
          finalState: "Done",
          reducedMotionState: "",
        },
      }),
    );
    assert.equal(result.ok, false);
    assert.match(
      result.errors.map((e) => e.message).join("\n"),
      /Reduced-motion/,
    );
  });

  it("defineDemoSpec throws on invalid timing", () => {
    assert.throws(
      () =>
        defineDemoSpec(
          baseSpec({
            playback: {
              duration: 10,
              loop: true,
              autoplay: true,
            },
            beats: [
              {
                id: "overflow",
                label: "Overflow",
                start: 0,
                end: 12,
                description: "Past end",
              },
            ],
          }),
          { logWarnings: false },
        ),
      /Invalid DemoSpec/,
    );
  });
});
