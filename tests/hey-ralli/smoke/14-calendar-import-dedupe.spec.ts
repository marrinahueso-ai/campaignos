import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";
import {
  buildIcsCalendar,
  clickImportAll,
  countEventTitleOnCalendar,
  expectEventTitleVisible,
  expectReviewStatusBadge,
  expectStatCardAtLeast,
  formatDisplayDate,
  reviewMain,
  stagingSmokeDates,
  uploadIcsAndAwaitReview,
} from "../helpers/calendar-import";

/**
 * Calendar import Phase 2 dedupe smokes (ICS UID skip / Update / within-file Conflict).
 * See docs/qa/calendar-import-dedupe.md
 *
 * Uses unique titles + UIDs per run so staging is not polluted by collisions.
 * Does not exercise Meta artwork generation.
 */

test.describe("Calendar import dedupe", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  const runId = Date.now();
  const dates = stagingSmokeDates(runId);
  const eventTitle = `HR Dedupe Smoke ${runId}`;
  const eventUid = `hey-ralli-dedupe-${runId}@heyralli.test`;
  const conflictTitle = `HR Dedupe Conflict ${runId}`;

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Upload ICS and Import All creates events", async ({ page }) => {
    const ics = buildIcsCalendar([
      {
        uid: eventUid,
        summary: eventTitle,
        date: dates.initial,
      },
    ]);

    await uploadIcsAndAwaitReview(
      page,
      ics,
      `hey-ralli-dedupe-${runId}.ics`,
    );
    await expectNoBlankScreen(page);

    await expectEventTitleVisible(page, eventTitle);
    await expectReviewStatusBadge(page, "New");
    await expectStatCardAtLeast(page, /^total events found$/i, 1);

    await clickImportAll(page);

    // Success banner — CalendarReviewActions (incl. "All Events Imported") unmounts after import.
    await expect(
      reviewMain(page).getByText(/\d+\s+events?\s+added to your calendar/i),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("Re-import same ICS skips duplicates (no second create)", async ({
    page,
  }) => {
    const ics = buildIcsCalendar([
      {
        uid: eventUid,
        summary: eventTitle,
        date: dates.initial,
      },
    ]);

    await uploadIcsAndAwaitReview(
      page,
      ics,
      `hey-ralli-dedupe-${runId}-reimport.ics`,
    );

    await expectEventTitleVisible(page, eventTitle);
    await expectReviewStatusBadge(page, "Duplicate");
    await expectStatCardAtLeast(page, /^duplicates$/i, 1);

    await clickImportAll(page);

    const main = reviewMain(page);
    await expect(
      main.getByText(
        /\d+\s+events?\s+already on your calendar\s*—\s*nothing new to import/i,
      ),
    ).toBeVisible({ timeout: 60_000 });

    // Optional calendar check — review Duplicate + skip message is authoritative.
    const count = await countEventTitleOnCalendar(page, eventTitle);
    if (count == null) {
      test.info().annotations.push({
        type: "note",
        description:
          "Calendar Import list view did not open; skip message already confirmed no second create.",
      });
    } else {
      expect(count, "Re-import must not create a second event").toBeLessThanOrEqual(
        1,
      );
      expect(count, "Expected the originally imported event to remain").toBe(1);
    }
  });

  test("Same UID with date change → Update Apply → single event, new date", async ({
    page,
  }) => {
    const ics = buildIcsCalendar([
      {
        uid: eventUid,
        summary: eventTitle,
        date: dates.updated,
      },
    ]);

    await uploadIcsAndAwaitReview(
      page,
      ics,
      `hey-ralli-dedupe-${runId}-update.ics`,
    );

    await expectEventTitleVisible(page, eventTitle);
    await expectReviewStatusBadge(page, "Update");
    await expectStatCardAtLeast(page, /^updates$/i, 1);
    await expect(
      reviewMain(page).getByText(formatDisplayDate(dates.updated)),
    ).toBeVisible({ timeout: 15_000 });

    // Apply is the default; click explicitly for clarity.
    const applyButton = reviewMain(page).getByRole("button", {
      name: /^apply$/i,
    });
    if (await applyButton.count()) {
      await applyButton.first().click();
    }

    await clickImportAll(page);

    await expect(
      reviewMain(page).getByText(/\d+\s+events?\s+added to your calendar/i),
    ).toBeVisible({ timeout: 60_000 });

    // Re-upload the updated ICS → should now be Duplicate (fields match patched row).
    await uploadIcsAndAwaitReview(
      page,
      ics,
      `hey-ralli-dedupe-${runId}-update-verify.ics`,
    );
    await expectReviewStatusBadge(page, "Duplicate");
    await expectStatCardAtLeast(page, /^duplicates$/i, 1);

    // Re-upload as Duplicate proves the patched date matches — single row, not a second create.
    const count = await countEventTitleOnCalendar(page, eventTitle);
    if (count == null) {
      test.info().annotations.push({
        type: "note",
        description:
          "Calendar Import list view did not open; Duplicate re-verify already confirmed date patch.",
      });
    } else {
      expect(count, "Date-change update must keep a single event").toBe(1);
    }
  });

  test("Within-file identical SUMMARY+DTSTART shows Conflict in review", async ({
    page,
  }) => {
    const ics = buildIcsCalendar([
      {
        uid: `hey-ralli-dedupe-conflict-a-${runId}@heyralli.test`,
        summary: conflictTitle,
        date: dates.initial,
      },
      {
        uid: `hey-ralli-dedupe-conflict-b-${runId}@heyralli.test`,
        summary: conflictTitle,
        date: dates.initial,
      },
    ]);

    await uploadIcsAndAwaitReview(
      page,
      ics,
      `hey-ralli-dedupe-${runId}-conflict.ics`,
    );
    await expectNoBlankScreen(page);

    await expectEventTitleVisible(page, conflictTitle);
    await expectReviewStatusBadge(page, "Conflict");
    await expectStatCardAtLeast(page, /^conflicts found$/i, 1);

    // Non-destructive: leave review without Import All so we do not create
    // conflict rows on the live calendar.
    await expect(
      mainContent(page).getByRole("button", { name: /^import all$/i }),
    ).toBeVisible();

    test.info().annotations.push({
      type: "note",
      description:
        "Within-file Conflict verified in review only — Import All intentionally not clicked.",
    });
  });
});
