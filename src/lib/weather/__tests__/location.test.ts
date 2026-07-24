import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOrganizationLocation } from "../location.ts";
import type { Organization } from "../../../types/index.ts";

function org(partial: Partial<Organization>): Organization {
  return {
    id: "org-1",
    name: "Test School",
    district: null,
    weatherCity: null,
    weatherState: null,
    schoolYear: null,
    mascot: null,
    principal: null,
    schoolWebsite: null,
    ptoWebsite: null,
    eventsUrl: null,
    calendarUrl: null,
    resourcesUrl: null,
    faqUrl: null,
    timezone: "America/Chicago",
    preferredPostingHours: null,
    foundingAccessCode: null,
    billingExemptAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("parseOrganizationLocation", () => {
  it("prefers weather city and state", () => {
    const location = parseOrganizationLocation(
      org({
        district: "Williamson County Schools",
        weatherCity: "Franklin",
        weatherState: "TN",
      }),
    );
    assert.equal(location?.label, "Franklin, TN");
    assert.equal(location?.query, "Franklin, TN, US");
  });

  it("parses City, ST from district", () => {
    const location = parseOrganizationLocation(
      org({ district: "Nashville, TN" }),
    );
    assert.equal(location?.label, "Nashville, TN");
  });

  it("uses cleaned freeform district when city/state unset", () => {
    const location = parseOrganizationLocation(
      org({ district: "Williamson County Schools" }),
    );
    assert.equal(location?.label, "Williamson County");
    assert.equal(location?.query, "Williamson County, US");
  });
});
