import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("Onboarding Ease page 4 — You’re set finale", () => {
  const toast = readSrc(
    "../../../components/onboarding/OnboardingYoureSetToast.tsx",
  );
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const eventPage = readSrc(
    "../../../app/(dashboard)/events/[id]/page.tsx",
  );
  const actions = readSrc("../actions.ts");
  const featureList = readSrc("../../../../docs/product/feature-list.md");
  const connectTest = readSrc("./onboarding-connect-ease.test.ts");

  it("matches mockup you’re-set copy and dismiss control", () => {
    assert.match(toast, /You’re set — here’s your event/);
    assert.match(toast, /is ready\. Optional setup can wait/);
    assert.match(toast, /Got it/);
    assert.match(toast, /data-onboarding-ease="youre-set"/);
    assert.doesNotMatch(toast, /OnboardingProgress/);
    assert.doesNotMatch(toast, /of 3/);
  });

  it("shows toast on event detail from welcome=1 without a second stepper", () => {
    assert.match(eventPage, /welcome === "1"/);
    assert.match(eventPage, /showYoureSet/);
    assert.match(shell, /OnboardingYoureSetToast/);
    assert.match(shell, /showYoureSet/);
    assert.doesNotMatch(shell, /OnboardingEaseStepMeter/);
    assert.doesNotMatch(shell, /OnboardingProgress/);
  });

  it("lands from page 3 with welcome=1 and finishes prompts", () => {
    assert.match(actions, /continueFromOnboardingConnectAction/);
    assert.match(actions, /promptsFinishedAt: now/);
    assert.match(
      actions,
      /\/events\/\$\{next\.firstEventId\}\?welcome=1/,
    );
  });

  it("marks Ease page 4 shipped and full 4-beat flow complete in feature-list", () => {
    assert.match(
      featureList,
      /Ease page 4 shipped[\s\S]*You’re set/,
    );
    assert.match(featureList, /Ease 4 beats complete/);
    assert.doesNotMatch(featureList, /Ease page 4 not shipped yet/);
  });

  it("updates connect feature-list assertion for page 4 shipped", () => {
    assert.match(connectTest, /page-4 welcome handoff/);
    assert.match(connectTest, /page-4 finale/);
  });
});
