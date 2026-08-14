import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Cron RLS regression guard: the /api/cron/insights-sync route lists Meta
 * connections with the admin client, but syncOrganizationInsights() and its
 * fetchPublishedSlotsForOrganization() helper previously called the shared,
 * session-only getOrganizationSchoolYearIds()/createClient() — the same bug
 * class already fixed for meta-token-health and story-post-reminders. Under
 * the cron (no user session), that made the org's school_years/events/
 * meta_publication_slots lookups silently return [] via RLS, degrading
 * "sync Insights" to Graph-API-only discovery with no scheduling-slot
 * metadata, while the cron still reported a healthy `ok: true`.
 */
function readInsightsSyncSrc(): string {
  return readFileSync(new URL("../insights-sync.ts", import.meta.url), "utf8");
}

function readCronRouteSrc(): string {
  return readFileSync(
    new URL("../../../app/api/cron/insights-sync/route.ts", import.meta.url),
    "utf8",
  );
}

describe("syncOrganizationInsights — service-role plumbing", () => {
  it("accepts a useServiceRole option and threads it into getMetaConnectionForOrganization", () => {
    const src = readInsightsSyncSrc();
    const fnStart = src.indexOf("export async function syncOrganizationInsights(");
    assert.ok(fnStart >= 0);
    const body = src.slice(fnStart, fnStart + 800);
    assert.match(body, /useServiceRole\?:\s*boolean/);
    assert.match(body, /getMetaConnectionForOrganization\(input\.organizationId,\s*\{\s*\n?\s*useServiceRole,?\s*\n?\s*\}\)/);
  });

  it("fetchPublishedSlotsForOrganization uses createJobClient, not the shared session-only school-year helper", () => {
    const src = readInsightsSyncSrc();
    assert.doesNotMatch(src, /from "@\/lib\/events\/org-scope"/);
    assert.match(src, /import \{ createJobClient \} from "@\/lib\/supabase\/job-client";/);

    const fnStart = src.indexOf("async function fetchPublishedSlotsForOrganization(");
    assert.ok(fnStart >= 0);
    const fnEnd = src.indexOf("\n}\n", fnStart);
    const body = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);
    assert.match(body, /createJobClient\(useServiceRole\)/);
  });

  it("call site passes useServiceRole through to fetchPublishedSlotsForOrganization", () => {
    const src = readInsightsSyncSrc();
    assert.match(
      src,
      /fetchPublishedSlotsForOrganization\(\s*\n?\s*input\.organizationId,\s*\n?\s*useServiceRole,?\s*\n?\s*\)/,
    );
  });
});

describe("/api/cron/insights-sync route", () => {
  it("calls syncOrganizationInsights with useServiceRole: true", () => {
    const src = readCronRouteSrc();
    const callIdx = src.indexOf("syncOrganizationInsights({");
    assert.ok(callIdx >= 0);
    const call = src.slice(callIdx, callIdx + 200);
    assert.match(call, /useServiceRole:\s*true/);
  });
});
