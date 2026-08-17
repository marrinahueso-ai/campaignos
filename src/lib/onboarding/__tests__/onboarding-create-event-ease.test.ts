import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("Onboarding Ease page 1 — Create your first event", () => {
  const ease = readSrc(
    "../../../components/onboarding/OnboardingCreateEventEase.tsx",
  );
  const meter = readSrc(
    "../../../components/onboarding/OnboardingEaseStepMeter.tsx",
  );
  const createPage = readSrc(
    "../../../app/(dashboard)/events/create/page.tsx",
  );
  const onboardingPage = readSrc(
    "../../../app/(dashboard)/onboarding/page.tsx",
  );
  const welcome = readSrc(
    "../../../components/onboarding/OnboardingWelcome.tsx",
  );
  const actions = readSrc("../actions.ts");
  const featureList = readSrc("../../../../docs/product/feature-list.md");

  it("matches mockup event copy, quiet org line, and Save & continue", () => {
    assert.match(ease, /Create your first event/);
    assert.match(ease, /Welcome to Hey Ralli/);
    assert.match(ease, /Setting up/);
    assert.match(ease, /Title and date are enough/);
    assert.match(ease, /everything after this is skippable/);
    assert.match(ease, /Event title/);
    assert.match(ease, /Event date/);
    assert.match(ease, /Time[\s\S]*\(optional\)/);
    assert.match(ease, /Save & continue/);
    assert.match(ease, /data-onboarding-ease="event"/);
    assert.match(ease, /OnboardingEaseStepMeter/);
    assert.doesNotMatch(ease, /OnboardingProgress/);
    assert.doesNotMatch(ease, /Cancel/);
  });

  it("uses a single 1 of 3 step meter (no dual steppers)", () => {
    assert.match(meter, /of 3/);
    assert.match(meter, /step: 1 \| 2 \| 3/);
    assert.match(createPage, /OnboardingCreateEventEase/);
    assert.doesNotMatch(createPage, /OnboardingProgress/);
  });

  it("routes first-time users to event Ease; bootstrap only when no membership", () => {
    assert.match(onboardingPage, /redirect\("\/events\/create\?onboarding=1"\)/);
    assert.match(welcome, /Let.s set up your school/);
    assert.match(welcome, /Continue/);
    assert.match(welcome, /startValueFirstOnboardingAction/);
    assert.match(welcome, /data-onboarding-ease="bootstrap"/);
    assert.doesNotMatch(welcome, /OnboardingProgress/);
    assert.doesNotMatch(welcome, /What event are you planning first/);
    assert.match(actions, /redirect\("\/events\/create\?onboarding=1"\)/);
  });

  it("New School Handoff is a full-viewport auth card, not dashboard header height", () => {
    assert.match(welcome, /min-h-dvh/);
    assert.doesNotMatch(welcome, /Open navigation/);
  });

  it("marks Ease page 1 shipped in feature-list", () => {
    assert.match(
      featureList,
      /Ease page 1 shipped[\s\S]*Create your first event/,
    );
  });
});
