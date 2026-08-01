import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractErrorMessage } from "../error-message.ts";

describe("extractErrorMessage", () => {
  it("prefers Error.message", () => {
    assert.equal(
      extractErrorMessage(new Error("Artwork generation failed.")),
      "Artwork generation failed.",
    );
  });

  it("reads plain-object message (PostgREST shape)", () => {
    assert.equal(
      extractErrorMessage({
        message:
          "Could not find the table 'public.campaign_builder_sessions' in the schema cache",
      }),
      "Could not find the table 'public.campaign_builder_sessions' in the schema cache",
    );
  });

  it("falls back to code/details/hint when message is empty", () => {
    assert.equal(
      extractErrorMessage({
        code: "PGRST205",
        details: "table missing from schema cache",
        hint: "reload the schema",
      }),
      "PGRST205 — table missing from schema cache — reload the schema",
    );
  });

  it("uses caller fallback then Unknown integration error", () => {
    assert.equal(extractErrorMessage({}, "save failed"), "save failed");
    assert.equal(extractErrorMessage(null), "Unknown integration error");
  });
});
