import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOnboardingChecklist,
  defaultSchoolYearLabel,
  hasCompletedFirstEvent,
  nextOnboardingPrompt,
  parseOnboardingState,
} from "@/lib/onboarding/state";

describe("onboarding state", () => {
  it("parses empty and partial state", () => {
    assert.equal(parseOnboardingState(null).version, 1);
    const parsed = parseOnboardingState({
      version: 1,
      firstEventId: "evt-1",
      firstEventCompletedAt: "2026-07-22T00:00:00.000Z",
    });
    assert.equal(parsed.firstEventId, "evt-1");
    assert.equal(hasCompletedFirstEvent(parsed), true);
  });

  it("orders prompts calendar → brand → invite", () => {
    const base = parseOnboardingState({
      version: 1,
      firstEventId: "e1",
      firstEventCompletedAt: "2026-07-22T00:00:00.000Z",
    });
    assert.equal(nextOnboardingPrompt(base), "calendar");
    assert.equal(
      nextOnboardingPrompt({
        ...base,
        calendarSkippedAt: "2026-07-22T00:00:00.000Z",
      }),
      "brand",
    );
    assert.equal(
      nextOnboardingPrompt({
        ...base,
        calendarCompletedAt: "2026-07-22T00:00:00.000Z",
        brandSkippedAt: "2026-07-22T00:00:00.000Z",
      }),
      "invite",
    );
    assert.equal(
      nextOnboardingPrompt({
        ...base,
        calendarCompletedAt: "2026-07-22T00:00:00.000Z",
        brandCompletedAt: "2026-07-22T00:00:00.000Z",
        inviteSkippedAt: "2026-07-22T00:00:00.000Z",
      }),
      null,
    );
  });

  it("builds checklist with pending optional items", () => {
    const items = buildOnboardingChecklist({
      state: parseOnboardingState({
        version: 1,
        startedAt: "2026-07-22T00:00:00.000Z",
        firstEventId: "e1",
        firstEventCompletedAt: "2026-07-22T00:00:00.000Z",
        calendarSkippedAt: "2026-07-22T00:00:00.000Z",
      }),
      hasCalendarSignal: false,
      hasBrandSignal: false,
      hasTeamSignal: false,
      firstEventHref: "/events/e1",
    });
    assert.equal(items.some((item) => item.id === "first_event"), false);
    assert.equal(items.find((item) => item.id === "calendar")?.done, false);
    const brand = items.find((item) => item.id === "brand");
    assert.equal(brand?.done, false);
    assert.equal(brand?.href, "/onboarding/brand");
    assert.equal(brand?.title, "Build your brand kit");
    assert.equal(brand?.cta, "Set up now");
  });

  it("overlay skip keeps checklist pending even with org signals; Later dismiss marks done", () => {
    const afterOverlaySkip = buildOnboardingChecklist({
      state: parseOnboardingState({
        version: 1,
        firstEventId: "e1",
        firstEventCompletedAt: "2026-07-22T00:00:00.000Z",
        calendarSkippedAt: "2026-07-22T00:00:00.000Z",
        brandSkippedAt: "2026-07-22T00:00:00.000Z",
        inviteSkippedAt: "2026-07-22T00:00:00.000Z",
      }),
      hasCalendarSignal: true,
      hasBrandSignal: true,
      hasTeamSignal: true,
      firstEventHref: "/events/e1",
    });
    assert.equal(
      afterOverlaySkip.find((item) => item.id === "calendar")?.done,
      false,
    );
    assert.equal(
      afterOverlaySkip.find((item) => item.id === "brand")?.done,
      false,
    );
    assert.equal(
      afterOverlaySkip.find((item) => item.id === "invite")?.done,
      false,
    );

    const signalsWithoutSkip = buildOnboardingChecklist({
      state: parseOnboardingState({
        version: 1,
        firstEventId: "e1",
        firstEventCompletedAt: "2026-07-22T00:00:00.000Z",
      }),
      hasCalendarSignal: true,
      hasBrandSignal: true,
      hasTeamSignal: true,
      firstEventHref: "/events/e1",
    });
    assert.equal(
      signalsWithoutSkip.every((item) => item.done),
      true,
    );

    const afterChecklistLater = buildOnboardingChecklist({
      state: parseOnboardingState({
        version: 1,
        firstEventId: "e1",
        firstEventCompletedAt: "2026-07-22T00:00:00.000Z",
        calendarSkippedAt: "2026-07-22T00:00:00.000Z",
        calendarChecklistDismissedAt: "2026-07-22T00:01:00.000Z",
        brandCompletedAt: "2026-07-22T00:02:00.000Z",
        inviteSkippedAt: "2026-07-22T00:00:00.000Z",
        inviteChecklistDismissedAt: "2026-07-22T00:03:00.000Z",
      }),
      hasCalendarSignal: true,
      hasBrandSignal: false,
      hasTeamSignal: true,
      firstEventHref: "/events/e1",
    });
    assert.equal(
      afterChecklistLater.find((item) => item.id === "calendar")?.done,
      true,
    );
    assert.equal(
      afterChecklistLater.find((item) => item.id === "brand")?.done,
      true,
    );
    assert.equal(
      afterChecklistLater.find((item) => item.id === "invite")?.done,
      true,
    );
  });

  it("defaultSchoolYearLabel uses July boundary", () => {
    assert.equal(
      defaultSchoolYearLabel(new Date("2026-07-22T12:00:00Z")),
      "2026 - 2027",
    );
    assert.equal(
      defaultSchoolYearLabel(new Date("2026-01-15T12:00:00Z")),
      "2025 - 2026",
    );
  });
});
