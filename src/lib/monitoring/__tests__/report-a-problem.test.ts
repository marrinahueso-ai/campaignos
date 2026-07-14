import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractIdsFromPath,
  formatReportProblemMessage,
  toShortReference,
} from "@/lib/monitoring/report-a-problem-context";
import { canSeeReportAProblem } from "@/lib/monitoring/report-a-problem-access";

describe("report-a-problem-context", () => {
  it("extracts event id from event routes", () => {
    const ids = extractIdsFromPath(
      "/events/723f85ce-e44f-43f6-97b5-723aa33ba7f8/campaign-builder",
      "",
    );
    assert.equal(ids.eventId, "723f85ce-e44f-43f6-97b5-723aa33ba7f8");
  });

  it("formats structured feedback message", () => {
    const message = formatReportProblemMessage({
      tryingToDo: "Generate artwork",
      whatHappened: "Old image stayed on event page",
      expected: "New image everywhere",
      notes: "Back to School Fair",
    });
    assert.match(message, /What were you trying to do\?/);
    assert.match(message, /Generate artwork/);
    assert.match(message, /Back to School Fair/);
  });

  it("builds a short reference", () => {
    assert.equal(toShortReference("abcd1234-5678"), "ABCD1234");
  });
});

describe("report-a-problem-access", () => {
  it("allows admins when Sentry DSN is configured", () => {
    const previous = process.env.NEXT_PUBLIC_SENTRY_DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN =
      "https://examplePublicKey@o0.ingest.sentry.io/0";
    try {
      assert.equal(
        canSeeReportAProblem({ email: "parent@school.org", role: "admin" }),
        true,
      );
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_SENTRY_DSN;
      } else {
        process.env.NEXT_PUBLIC_SENTRY_DSN = previous;
      }
    }
  });
});
