import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

const composer = readSrc(
  "../../../components/campaign-builder-v2/social-composer/SocialMediaComposer.tsx",
);
const inspirationStep = readSrc(
  "../../../components/campaign-builder-v2/InspirationStep.tsx",
);
const provider = readSrc(
  "../../../components/campaign-builder-v2/CampaignBuilderProvider.tsx",
);

describe("Social Setup inspiration multi-file upload", () => {
  it("snapshots every dropped or picked file and does not drop on a button", () => {
    assert.match(composer, /filesFromDataTransfer/);
    assert.match(composer, /addInspirationImages/);
    assert.match(composer, /Array\.from\(event\.target\.files/);
    assert.match(composer, /multiple/);
    assert.match(composer, /insp-drop setup-insp-drop/);
    assert.match(composer, /onDrop=\{\(event\) => \{/);
    assert.match(
      composer,
      /htmlFor="social-composer-inspiration-input"/,
    );
    assert.doesNotMatch(
      composer,
      /<button[\s\n]+type="button"[\s\S]{0,240}onDrop=/,
    );
    assert.doesNotMatch(composer, /files\?\.\[0\]/);
    assert.doesNotMatch(composer, /dataTransfer\.files\?\.\[0\]/);
  });

  it("legacy Inspiration step uses the same Safari-safe drop path", () => {
    assert.match(inspirationStep, /filesFromDataTransfer/);
    assert.match(inspirationStep, /addInspirationImages/);
    assert.match(inspirationStep, /Array\.from\(event\.target\.files/);
    assert.match(inspirationStep, /multiple/);
    assert.match(inspirationStep, /aria-label="Upload inspiration images"/);
    assert.match(inspirationStep, /onDrop=\{\(event\) => \{/);
    assert.doesNotMatch(
      inspirationStep,
      /<button[\s\n]+type="button"[\s\S]{0,240}onDrop=/,
    );
    assert.doesNotMatch(inspirationStep, /dataTransfer\.files\?\.\[0\]/);
  });

  it("assigns unique ids and merges by name+size+lastModified in one session update", () => {
    assert.match(provider, /addInspirationImages/);
    assert.match(provider, /createInspirationImageId/);
    assert.match(provider, /selectNewInspirationFiles/);
    assert.match(provider, /inspirationFileKey/);
    assert.match(provider, /sourceKey/);
    assert.doesNotMatch(provider, /inspiration-\$\{Date\.now\(\)\}/);
  });
});
