import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { userMustAcceptCurrentTerms } from "../gate.ts";
import { CURRENT_TERMS_VERSION } from "../versions.ts";

function makeSupabaseStub(data: {
  rows?: Array<{ user_id: string; document_type: string; version: string }>;
  error?: { code?: string; message: string } | null;
}) {
  return {
    from(table: string) {
      assert.equal(table, "legal_acceptances");
      let rows = data.rows ?? [];
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          rows = rows.filter((row) => (row as Record<string, unknown>)[column] === value);
          return builder;
        },
        then(
          resolve: (value: {
            data: unknown;
            error: { code?: string; message: string } | null;
          }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) {
          if (data.error) {
            return Promise.resolve({ data: null, error: data.error }).then(
              resolve,
              reject,
            );
          }
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("userMustAcceptCurrentTerms", () => {
  const USER = "user-1";
  const OTHER = "user-2";

  it("gates an existing user with no current-version row", async () => {
    const supabase = makeSupabaseStub({ rows: [] });
    assert.equal(await userMustAcceptCurrentTerms(supabase, USER), true);
  });

  it("does not gate a user who accepted the current Terms version", async () => {
    const supabase = makeSupabaseStub({
      rows: [
        {
          user_id: USER,
          document_type: "terms",
          version: CURRENT_TERMS_VERSION,
        },
      ],
    });
    assert.equal(await userMustAcceptCurrentTerms(supabase, USER), false);
  });

  it("gates a user who only has an older Terms version", async () => {
    const supabase = makeSupabaseStub({
      rows: [{ user_id: USER, document_type: "terms", version: "2026-07-26" }],
    });
    assert.equal(await userMustAcceptCurrentTerms(supabase, USER), true);
  });

  it("does not treat another user's acceptance as this user's", async () => {
    const supabase = makeSupabaseStub({
      rows: [
        {
          user_id: OTHER,
          document_type: "terms",
          version: CURRENT_TERMS_VERSION,
        },
      ],
    });
    assert.equal(await userMustAcceptCurrentTerms(supabase, USER), true);
  });

  it("fails open when the table is missing so a missing migration does not lock the app", async () => {
    const supabase = makeSupabaseStub({
      error: { code: "42P01", message: "undefined table" },
    });
    assert.equal(await userMustAcceptCurrentTerms(supabase, USER), false);
  });
});
