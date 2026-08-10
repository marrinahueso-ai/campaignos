import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeEligibilityFromContacts,
  type EligibilityContactInput,
} from "@/lib/newsletter/audience-eligibility";

function contact(overrides: Partial<EligibilityContactInput>): EligibilityContactInput {
  return {
    contactId: overrides.contactId ?? "contact-1",
    email: overrides.email ?? "parent@example.com",
    emailNormalized: overrides.emailNormalized ?? "parent@example.com",
    firstName: overrides.firstName ?? "Sam",
    lastName: overrides.lastName ?? "Lee",
    status: overrides.status ?? "active",
  };
}

describe("computeEligibilityFromContacts", () => {
  it("excludes unsubscribed, suppressed, bounced, and complained contacts", () => {
    const members: EligibilityContactInput[] = [
      contact({ contactId: "1", emailNormalized: "a@example.com", status: "active" }),
      contact({ contactId: "2", emailNormalized: "b@example.com", status: "unsubscribed" }),
      contact({ contactId: "3", emailNormalized: "c@example.com", status: "suppressed" }),
      contact({ contactId: "4", emailNormalized: "d@example.com", status: "bounced" }),
      contact({ contactId: "5", emailNormalized: "e@example.com", status: "complained" }),
    ];

    const result = computeEligibilityFromContacts(members);

    assert.equal(result.selected, 5);
    assert.equal(result.eligible, 1);
    assert.equal(result.excluded, 4);
    assert.deepEqual(
      result.contacts.map((c) => c.contactId),
      ["1"],
    );
  });

  it("dedupes by normalized email among active contacts", () => {
    const members: EligibilityContactInput[] = [
      contact({ contactId: "1", emailNormalized: "dup@example.com" }),
      contact({ contactId: "2", emailNormalized: "dup@example.com" }),
      contact({ contactId: "3", emailNormalized: "unique@example.com" }),
    ];

    const result = computeEligibilityFromContacts(members);

    assert.equal(result.selected, 3);
    assert.equal(result.eligible, 2);
    assert.equal(result.excluded, 1);
  });

  it("returns zeros for an empty selection", () => {
    const result = computeEligibilityFromContacts([]);
    assert.deepEqual(result, { selected: 0, eligible: 0, excluded: 0, contacts: [] });
  });
});
