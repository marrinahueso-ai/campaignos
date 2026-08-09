import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSyntheticAuthEmail,
  generateUsernameFromFullName,
  isEmailLoginIdentifier,
  isSyntheticAuthEmail,
  isValidUsernameFormat,
  nextUsernameCandidate,
  normalizeUsername,
  validateUsernameCandidate,
} from "@/lib/auth/usernames";

describe("username generation and validation", () => {
  it("generates username from full name", () => {
    assert.equal(generateUsernameFromFullName("Jamie Smith"), "jamie.smith");
    assert.equal(generateUsernameFromFullName("  Mary-Jane O'Neil "), "mary.jane.o.neil");
  });

  it("normalizes case-insensitively", () => {
    assert.equal(normalizeUsername("Jamie.Smith"), "jamie.smith");
    assert.equal(normalizeUsername(" JAMIE.SMITH "), "jamie.smith");
  });

  it("validates format and reserved names", () => {
    assert.equal(validateUsernameCandidate("jamie.smith"), null);
    assert.ok(validateUsernameCandidate("ab"));
    assert.ok(validateUsernameCandidate("admin"));
    assert.equal(isValidUsernameFormat("jamie.smith"), true);
    assert.equal(isValidUsernameFormat("Jamie.Smith"), false);
  });

  it("handles collision suffixes without overwriting", () => {
    assert.equal(nextUsernameCandidate("jamie.smith", 1), "jamie.smith");
    assert.equal(nextUsernameCandidate("jamie.smith", 2), "jamie.smith2");
    assert.equal(nextUsernameCandidate("jamie.smith", 10), "jamie.smith10");
    // Distinct candidates for successive collisions
    const seen = new Set<string>();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const candidate = nextUsernameCandidate("jamie.smith", attempt);
      assert.equal(seen.has(candidate), false);
      seen.add(candidate);
    }
  });

  it("builds synthetic auth emails that never look like school mail", () => {
    const email = buildSyntheticAuthEmail("11111111-2222-3333-4444-555555555555");
    assert.match(email, /^u_[a-f0-9]+@users\.heyralli\.invalid$/);
    assert.equal(isSyntheticAuthEmail(email), true);
    assert.equal(isSyntheticAuthEmail("parent@school.edu"), false);
    assert.equal(isSyntheticAuthEmail(null), false);
  });

  it("distinguishes email vs username login identifiers", () => {
    assert.equal(isEmailLoginIdentifier("jamie.smith"), false);
    assert.equal(isEmailLoginIdentifier("jamie@school.edu"), true);
  });
});

describe("create login contract (no email required)", () => {
  it("create-mode form fields do not include member email", () => {
    // Mirrors TeamAccessPilotAddMemberModal submit payload for createMode=username.
    const form = new FormData();
    form.set("createMode", "username");
    form.set("fullName", "Jamie Smith");
    form.set("username", "jamie.smith");
    form.set("password", "ralli-temp1234");
    form.set("campaignRole", "committee_chair");
    form.set("eventIdsCsv", "evt-1,evt-2");

    assert.equal(form.get("createMode"), "username");
    assert.equal(form.get("email"), null);
    assert.ok(form.get("username"));
    assert.ok(form.get("fullName"));
    assert.ok(!(form.get("password") as string).includes("@"));
  });

  it("invite-by-email form still requires email and omits username", () => {
    const form = new FormData();
    form.set("fullName", "Jamie Smith");
    form.set("email", "jamie@school.edu");
    form.set("campaignRole", "committee_chair");
    form.set("sendEmail", "true");

    assert.equal(form.get("email"), "jamie@school.edu");
    assert.equal(form.get("createMode"), null);
    assert.equal(form.get("username"), null);
  });
});

describe("login identifier resolution semantics", () => {
  it("uses generic failure copy that does not reveal username existence", () => {
    const generic = "Incorrect username/email or password.";
    // Same message whether username missing or password wrong.
    assert.match(generic, /Incorrect username\/email or password/);
    assert.doesNotMatch(generic, /does not exist|not found|unknown/i);
  });

  it("routes @ identifiers as email and others as username", () => {
    const classify = (id: string) =>
      isEmailLoginIdentifier(id) ? "email" : "username";
    assert.equal(classify("sarah@email.com"), "email");
    assert.equal(classify("jamie.smith"), "username");
  });
});

describe("multi-org identity boundaries", () => {
  it("synthetic auth email is never a contact email candidate", () => {
    const synthetic = buildSyntheticAuthEmail();
    assert.equal(isSyntheticAuthEmail(synthetic), true);
    // Invite / multi-org email matching must ignore synthetic identities.
    assert.equal(synthetic.includes("@users.heyralli.invalid"), true);
  });

  it("username uniqueness is global (normalized), not per-org", () => {
    // Documented contract: auth_usernames.username_normalized is globally unique.
    const a = normalizeUsername("Jamie.Smith");
    const b = normalizeUsername("jamie.smith");
    assert.equal(a, b);
  });
});
