import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Cron RLS regression guard: same bug class already fixed for
 * meta-token-health, story-post-reminders, and insights-sync. The
 * /api/cron/inbox-sync route lists connected orgs with the admin client, but
 * syncInboxForOrganization()'s settings/upsert reads and writes used the
 * plain session client (createClient()) with no useServiceRole opt-in. Under
 * the cron (no user session), organization_inbox_settings and
 * inbox_threads/inbox_messages RLS would silently block those reads/writes,
 * degrading inbox sync to Graph-API discovery with no persisted
 * threads/messages and no recorded sync error — while the cron still
 * reported a healthy `ok: true`.
 */
function readSrc(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("inbox settings — service-role plumbing", () => {
  const src = readSrc("../settings.ts");

  it("getOrganizationInboxSettings and upsertOrganizationInboxSettings accept useServiceRole and use createJobClient", () => {
    assert.match(src, /import \{ createJobClient \} from "@\/lib\/supabase\/job-client";/);
    assert.doesNotMatch(src, /import \{ createClient \} from "@\/lib\/supabase\/server";/);

    const getStart = src.indexOf("export async function getOrganizationInboxSettings(");
    assert.ok(getStart >= 0);
    const getBody = src.slice(getStart, getStart + 400);
    assert.match(getBody, /options\?\:\s*\{\s*useServiceRole\?\:\s*boolean\s*\}/);
    assert.match(getBody, /createJobClient\(Boolean\(options\?\.useServiceRole\)\)/);

    const upsertStart = src.indexOf("export async function upsertOrganizationInboxSettings(");
    assert.ok(upsertStart >= 0);
    const upsertBody = src.slice(upsertStart, upsertStart + 500);
    assert.match(upsertBody, /useServiceRole\?\:\s*boolean/);
    assert.match(upsertBody, /createJobClient\(Boolean\(input\.useServiceRole\)\)/);
  });
});

describe("upsertInboxBatch — service-role plumbing", () => {
  it("accepts useServiceRole and uses createJobClient instead of the plain session client", () => {
    const src = readSrc("../sync/upsert.ts");
    assert.match(src, /import \{ createJobClient \} from "@\/lib\/supabase\/job-client";/);

    const start = src.indexOf("export async function upsertInboxBatch(");
    assert.ok(start >= 0);
    const body = src.slice(start, start + 400);
    assert.match(body, /useServiceRole\?\:\s*boolean/);
    assert.match(body, /createJobClient\(Boolean\(input\.useServiceRole\)\)/);
  });
});

describe("syncInboxForOrganization / syncAllOrganizationsInbox — cron service-role wiring", () => {
  const src = readSrc("../sync/sync-organization.ts");

  it("syncInboxForOrganization threads useServiceRole into every RLS-protected call it makes", () => {
    const start = src.indexOf("export async function syncInboxForOrganization(");
    assert.ok(start >= 0);
    const end = src.indexOf("export async function syncAllOrganizationsInbox(");
    const body = src.slice(start, end >= 0 ? end : undefined);

    assert.match(body, /options\?\:\s*\{\s*useServiceRole\?\:\s*boolean\s*\}/);
    assert.match(
      body,
      /getMetaConnectionForOrganization\(organizationId, \{ useServiceRole \}\)/,
    );
    assert.match(body, /getOrganizationInboxSettings\(organizationId, \{\s*\n?\s*useServiceRole,?\s*\n?\s*\}\)/);
    // Every upsertOrganizationInboxSettings call site in this function passes useServiceRole through.
    const upsertSettingsCalls = body.split("upsertOrganizationInboxSettings({").length - 1;
    const upsertSettingsWithFlag = body
      .split("upsertOrganizationInboxSettings({")
      .slice(1)
      .filter((chunk) => chunk.slice(0, 200).includes("useServiceRole")).length;
    assert.ok(upsertSettingsCalls >= 3, "expected 3 upsertOrganizationInboxSettings call sites");
    assert.strictEqual(upsertSettingsWithFlag, upsertSettingsCalls);

    assert.match(body, /upsertInboxBatch\(\{[\s\S]*?useServiceRole,?[\s\S]*?\}\)/);
  });

  it("syncAllOrganizationsInbox (the cron entry point) opts every org into useServiceRole: true", () => {
    const start = src.indexOf("export async function syncAllOrganizationsInbox(");
    assert.ok(start >= 0);
    const body = src.slice(start);
    assert.match(
      body,
      /syncInboxForOrganization\(organizationId, \{\s*\n?\s*useServiceRole: true,?\s*\n?\s*\}\)/,
    );
  });
});
