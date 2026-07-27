import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("Onboarding Ease page 3 — Team & Meta", () => {
  const ease = readSrc(
    "../../../components/onboarding/OnboardingConnectEase.tsx",
  );
  const page = readSrc(
    "../../../app/(dashboard)/onboarding/connect/page.tsx",
  );
  const actions = readSrc("../actions.ts");
  const eventPage = readSrc(
    "../../../app/(dashboard)/events/[id]/page.tsx",
  );
  const onboardingPage = readSrc(
    "../../../app/(dashboard)/onboarding/page.tsx",
  );
  const invitePage = readSrc(
    "../../../app/(dashboard)/onboarding/invite/page.tsx",
  );
  const metaPage = readSrc(
    "../../../app/(dashboard)/onboarding/meta/page.tsx",
  );
  const featureList = readSrc("../../../../docs/product/feature-list.md");
  const meter = readSrc(
    "../../../components/onboarding/OnboardingEaseStepMeter.tsx",
  );
  const essentialsTest = readSrc("./onboarding-essentials-ease.test.ts");

  it("matches mockup connect copy, skips, and 3 of 3 meter", () => {
    assert.match(ease, /Team &amp; Meta|Team & Meta/);
    assert.match(ease, /Optional · last setup step/);
    assert.match(ease, /Invite help and connect publishing/);
    assert.match(ease, /Invite a teammate/);
    assert.match(ease, /Connect Facebook &amp; Instagram|Connect Facebook & Instagram/);
    assert.match(ease, /Skip invite/);
    assert.match(ease, /Skip Meta/);
    assert.match(ease, /Skip for now/);
    assert.match(ease, /Send invite/);
    assert.match(ease, /Connect with Meta/);
    assert.match(ease, /Go to \{eventLabel\}/);
    assert.match(ease, /data-onboarding-ease="connect"/);
    assert.match(ease, /OnboardingEaseStepMeter/);
    assert.match(ease, /step=\{3\}/);
    assert.doesNotMatch(ease, /OnboardingProgress/);
  });

  it("uses a single 3 of 3 step meter (no dual steppers)", () => {
    assert.match(meter, /of 3/);
    assert.match(page, /OnboardingConnectEase/);
    assert.doesNotMatch(page, /OnboardingProgress/);
    assert.doesNotMatch(ease, /Event→Calendar→Brand/);
  });

  it("routes page 2 continue and invite/meta to connect", () => {
    assert.match(actions, /continueFromOnboardingEssentialsAction/);
    assert.match(actions, /continueFromOnboardingConnectAction/);
    assert.match(actions, /sendOnboardingConnectInviteAction/);
    assert.match(actions, /skipOnboardingConnectSectionAction/);
    assert.match(actions, /markOnboardingMetaCompleteAction/);
    assert.match(
      actions,
      /step === "invite" \|\| step === "meta"/,
    );
    assert.match(actions, /\/onboarding\/connect/);
    assert.match(onboardingPage, /redirect\("\/onboarding\/connect"\)/);
    assert.match(eventPage, /redirect\("\/onboarding\/connect"\)/);
    assert.match(invitePage, /redirect\("\/onboarding\/connect"\)/);
    assert.match(metaPage, /redirect\("\/onboarding\/connect"\)/);
    assert.doesNotMatch(eventPage, /EventOnboardingPrompt/);
  });

  it("marks Ease page 3 shipped and continues to page-4 welcome handoff", () => {
    assert.match(
      featureList,
      /Ease page 3 shipped[\s\S]*Team \+ Meta/,
    );
    assert.match(
      featureList,
      /after Continue\/Skip → created event with page-4 finale/,
    );
    assert.doesNotMatch(featureList, /Ease pages 3–4 not shipped yet/);
    assert.doesNotMatch(featureList, /Ease page 4 not shipped yet/);
  });

  it("updates essentials feature-list assertion for page 3 shipped", () => {
    // Keep page-2 test honest: it should no longer claim pages 3–4 unshipped.
    assert.doesNotMatch(
      essentialsTest,
      /Ease pages 3–4 not shipped yet/,
    );
  });
});
