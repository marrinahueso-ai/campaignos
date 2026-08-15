import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readRepo(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("legal_acceptances RLS contract", () => {
  const migration = readRepo(
    "../../../../supabase/migrations/20260814190000_legal_acceptances.sql",
  );
  const acceptances = readRepo("../acceptances.ts");
  const actions = readRepo("../actions.ts");

  it("enables RLS and only allows a user to read their own rows", () => {
    assert.match(migration, /enable row level security/);
    assert.match(migration, /for select to authenticated/);
    assert.match(migration, /using \(user_id = auth\.uid\(\)\)/);
  });

  it("blocks client inserts, updates, and deletes so org admins cannot falsify another user", () => {
    assert.match(
      migration,
      /revoke insert, update, delete on public\.legal_acceptances from anon, authenticated/,
    );
    assert.doesNotMatch(migration, /for insert to authenticated/);
    assert.doesNotMatch(migration, /for update to authenticated/);
    assert.doesNotMatch(migration, /for delete to authenticated/);
  });

  it("writes only through the service-role admin client after session auth", () => {
    assert.match(acceptances, /createAdminClient/);
    assert.match(actions, /getAuthUser/);
    assert.match(actions, /sessionUserId: user\.id/);
  });

  it("keeps acceptance append-only via unique user\/document\/version", () => {
    assert.match(migration, /unique \(user_id, document_type, version\)/);
    assert.match(acceptances, /ignoreDuplicates: true/);
  });
});
