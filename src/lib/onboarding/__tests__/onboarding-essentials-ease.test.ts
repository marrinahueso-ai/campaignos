import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("Onboarding Ease page 2 — Calendar & brand", () => {
  const ease = readSrc(
    "../../../components/onboarding/OnboardingEssentialsEase.tsx",
  );
  const page = readSrc(
    "../../../app/(dashboard)/onboarding/essentials/page.tsx",
  );
  const actions = readSrc("../actions.ts");
  const eventsActions = readSrc("../../events/actions.ts");
  const eventPage = readSrc(
    "../../../app/(dashboard)/events/[id]/page.tsx",
  );
  const onboardingPage = readSrc(
    "../../../app/(dashboard)/onboarding/page.tsx",
  );
  const featureList = readSrc("../../../../docs/product/feature-list.md");
  const meter = readSrc(
    "../../../components/onboarding/OnboardingEaseStepMeter.tsx",
  );

  it("matches mockup essentials copy, skips, and 2 of 3 meter", () => {
    assert.match(ease, /Calendar &amp; brand|Calendar & brand/);
    assert.match(ease, /Optional · about 2 minutes/);
    assert.match(ease, /Two helpful extras for/);
    assert.match(ease, /Import school calendar/);
    assert.match(ease, /Brand basics/);
    assert.match(ease, /Skip calendar/);
    assert.match(ease, /Skip brand/);
    assert.match(ease, /Skip for now/);
    assert.match(ease, /Connect calendar/);
    assert.match(ease, /Save brand kit/);
    assert.match(ease, /Google Calendar/);
    assert.match(ease, /ICS \/ webcal link/);
    assert.match(ease, /Upload a file/);
    assert.match(ease, /data-onboarding-ease="essentials"/);
    assert.match(ease, /OnboardingEaseStepMeter/);
    assert.match(ease, /step=\{2\}/);
    assert.doesNotMatch(ease, /OnboardingProgress/);
  });

  it("uses a single 2 of 3 step meter (no dual steppers)", () => {
    assert.match(meter, /of 3/);
    assert.match(page, /OnboardingEssentialsEase/);
    assert.doesNotMatch(page, /OnboardingProgress/);
    assert.doesNotMatch(ease, /Event→Calendar→Brand/);
  });

  it("routes post-event onboarding to essentials, not calendar overlay", () => {
    assert.match(eventsActions, /redirect\("\/onboarding\/essentials"\)/);
    assert.doesNotMatch(
      eventsActions,
      /onboarding=calendar/,
    );
    assert.match(onboardingPage, /redirect\("\/onboarding\/essentials"\)/);
    assert.match(eventPage, /redirect\("\/onboarding\/essentials"\)/);
    assert.match(actions, /continueFromOnboardingEssentialsAction/);
    assert.match(actions, /markOnboardingCalendarCompleteAction/);
    assert.match(
      actions,
      /step === "calendar" \|\| step === "brand"/,
    );
  });

  it("marks Ease page 2 shipped and continues to connect (page 3)", () => {
    assert.match(
      featureList,
      /Ease page 2 shipped[\s\S]*Calendar \+ Brand/,
    );
    assert.match(
      featureList,
      /after Continue\/Skip → `?\/onboarding\/connect`?/,
    );
    assert.doesNotMatch(featureList, /Ease pages 2–4 not shipped yet/);
  });
});
