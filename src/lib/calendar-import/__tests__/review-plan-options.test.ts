import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYSTEM_PLAYBOOK_IDS } from "../../playbooks/constants.ts";
import {
  applyPlaybookDefaultsToReviewEvents,
  buildCalendarReviewPlanOptions,
  CALENDAR_ONLY_PLAN_VALUE,
  defaultPlaybookIdForReview,
  getPlaybookPlanSummary,
  getSelectedReviewPlanValue,
  resolveReviewPlanSelection,
  type ReviewPlaybookOption,
} from "../review-plan-options.ts";
import type { CalendarReviewEvent } from "../../../types/calendar-review.ts";

const playbooks: ReviewPlaybookOption[] = [
  {
    id: SYSTEM_PLAYBOOK_IDS.general_event,
    name: "General Event",
    eventType: "general_event",
    stepCount: 8,
  },
  {
    id: SYSTEM_PLAYBOOK_IDS.book_fair,
    name: "Book Fair",
    eventType: "book_fair",
    stepCount: 7,
  },
  {
    id: "custom-playbook-1",
    name: "Spirit Night Custom",
    eventType: "spirit_night",
    stepCount: 2,
  },
];

function reviewEvent(
  overrides: Partial<CalendarReviewEvent> = {},
): CalendarReviewEvent {
  return {
    id: "evt-1",
    name: "Spring Carnival",
    date: "2026-04-01",
    category: "PTO Event",
    status: "ready",
    communicationStrategy: "full_campaign",
    eventType: "family_event",
    ...overrides,
  };
}

describe("getPlaybookPlanSummary", () => {
  it("formats step counts", () => {
    assert.equal(getPlaybookPlanSummary(0), "No steps yet");
    assert.equal(getPlaybookPlanSummary(1), "1 step");
    assert.equal(getPlaybookPlanSummary(8), "8 steps");
  });
});

describe("buildCalendarReviewPlanOptions", () => {
  it("puts calendar-only first, then org playbooks with summaries", () => {
    const options = buildCalendarReviewPlanOptions(playbooks);
    assert.equal(options[0]?.kind, "calendar_only");
    assert.equal(options[0]?.value, CALENDAR_ONLY_PLAN_VALUE);
    assert.equal(options.length, playbooks.length + 1);
    assert.equal(options[1]?.label, "General Event");
    assert.equal(options[1]?.summary, "8 steps");
  });
});

describe("resolveReviewPlanSelection", () => {
  it("maps calendar-only to null playbook", () => {
    assert.deepEqual(resolveReviewPlanSelection(CALENDAR_ONLY_PLAN_VALUE, playbooks), {
      playbookId: null,
      communicationStrategy: "calendar_only",
    });
  });

  it("maps playbook id to full_campaign + event type", () => {
    assert.deepEqual(
      resolveReviewPlanSelection(SYSTEM_PLAYBOOK_IDS.book_fair, playbooks),
      {
        playbookId: SYSTEM_PLAYBOOK_IDS.book_fair,
        communicationStrategy: "full_campaign",
        eventType: "book_fair",
      },
    );
  });

  it("falls back to calendar-only for unknown ids", () => {
    assert.deepEqual(resolveReviewPlanSelection("missing", playbooks), {
      playbookId: null,
      communicationStrategy: "calendar_only",
    });
  });
});

describe("defaultPlaybookIdForReview", () => {
  it("returns null for calendar-only", () => {
    assert.equal(
      defaultPlaybookIdForReview("book_fair", "calendar_only", playbooks),
      null,
    );
  });

  it("prefers system playbook for event type", () => {
    assert.equal(
      defaultPlaybookIdForReview("book_fair", "full_campaign", playbooks),
      SYSTEM_PLAYBOOK_IDS.book_fair,
    );
  });

  it("falls back to matching event type then general", () => {
    assert.equal(
      defaultPlaybookIdForReview("spirit_night", "full_campaign", playbooks),
      "custom-playbook-1",
    );
    assert.equal(
      defaultPlaybookIdForReview("fundraiser", "reminder_only", playbooks),
      SYSTEM_PLAYBOOK_IDS.general_event,
    );
  });
});

describe("getSelectedReviewPlanValue", () => {
  it("returns calendar-only for calendar-only strategy", () => {
    assert.equal(
      getSelectedReviewPlanValue(
        reviewEvent({ communicationStrategy: "calendar_only", playbookId: null }),
        playbooks,
      ),
      CALENDAR_ONLY_PLAN_VALUE,
    );
  });

  it("returns stored playbook when still available", () => {
    assert.equal(
      getSelectedReviewPlanValue(
        reviewEvent({
          playbookId: "custom-playbook-1",
          eventType: "spirit_night",
        }),
        playbooks,
      ),
      "custom-playbook-1",
    );
  });
});

describe("applyPlaybookDefaultsToReviewEvents", () => {
  it("fills missing playbook ids without changing status", () => {
    const [updated] = applyPlaybookDefaultsToReviewEvents(
      [
        reviewEvent({
          status: "duplicate",
          eventType: "book_fair",
          playbookId: null,
        }),
      ],
      playbooks,
    );
    assert.equal(updated?.status, "duplicate");
    assert.equal(updated?.playbookId, SYSTEM_PLAYBOOK_IDS.book_fair);
  });

  it("clears playbook for calendar-only rows", () => {
    const [updated] = applyPlaybookDefaultsToReviewEvents(
      [
        reviewEvent({
          communicationStrategy: "calendar_only",
          playbookId: SYSTEM_PLAYBOOK_IDS.general_event,
        }),
      ],
      playbooks,
    );
    assert.equal(updated?.playbookId, null);
  });

  it("keeps a valid manually stored playbook", () => {
    const [updated] = applyPlaybookDefaultsToReviewEvents(
      [
        reviewEvent({
          playbookId: "custom-playbook-1",
          eventType: "family_event",
        }),
      ],
      playbooks,
    );
    assert.equal(updated?.playbookId, "custom-playbook-1");
  });
});
