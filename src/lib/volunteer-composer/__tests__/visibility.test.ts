import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildInitialState,
  normalizeComposerState,
  opportunityFromEvent,
} from "@/lib/volunteer-composer/defaults";
import { exportVolunteerHtml } from "@/lib/volunteer-composer/export-html";
import type { VolunteerOpportunity } from "@/lib/volunteer-composer/types";
import {
  opportunityVisibility,
  PREVIEW_FULL_MONTH,
} from "@/lib/volunteer-composer/visibility";

function role(partial: Partial<VolunteerOpportunity>): VolunteerOpportunity {
  return {
    id: "r1",
    source: "custom",
    eventId: null,
    emoji: "🤝",
    title: "Helper",
    blurb: "Help out",
    whenLabel: "Aug 5",
    signupUrl: "https://www.signupgenius.com/go/demo",
    alwaysOn: false,
    startsOn: "2026-08-01",
    expiresOn: "2026-08-10",
    ...partial,
  };
}

describe("volunteer composer visibility", () => {
  it("marks Coming soon before on-date", () => {
    const vis = opportunityVisibility(role({}), "2026-07-27");
    assert.equal(vis.key, "soon");
    assert.equal(vis.label, "Coming soon");
    assert.equal(vis.show, true);
    assert.equal(vis.dimmed, true);
  });

  it("marks Open inside the window when a signup URL exists", () => {
    const vis = opportunityVisibility(role({}), "2026-08-05");
    assert.equal(vis.key, "open");
    assert.equal(vis.dimmed, false);
  });

  it("marks Closed after off-date", () => {
    const vis = opportunityVisibility(role({}), "2026-08-11");
    assert.equal(vis.key, "closed");
    assert.equal(vis.label, "Closed");
  });

  it("keeps always-on roles open on full month", () => {
    const vis = opportunityVisibility(
      role({ alwaysOn: true, startsOn: null, expiresOn: null }),
      PREVIEW_FULL_MONTH,
    );
    assert.equal(vis.key, "open");
    assert.equal(vis.dimmed, false);
  });
});

describe("volunteer composer defaults + export", () => {
  it("builds opportunities from events with signup URLs", () => {
    const opp = opportunityFromEvent({
      id: "evt-1",
      title: "Book Fair",
      description: "Help shelve books and greet families at the fair.",
      date: "2026-09-12",
      time: "09:00",
      imageUrl: null,
      volunteerSignupUrl: "https://www.signupgenius.com/go/bookfair",
    });
    assert.equal(opp.eventId, "evt-1");
    assert.equal(opp.signupUrl.includes("signupgenius"), true);
    assert.equal(opp.expiresOn, "2026-09-12");
  });

  it("normalizes legacy drafts missing optional fields", () => {
    const normalized = normalizeComposerState(
      {
        header: { title: "Volunteer With Us" },
        footer: {},
        opportunities: [
          {
            id: "legacy",
            title: "Old role",
            blurb: "Help",
            signupUrl: "",
            alwaysOn: true,
          },
        ],
      },
      "Lincoln PTO",
    );
    assert.ok(normalized);
    assert.equal(normalized.header.organizationLabel, "Lincoln PTO");
    assert.equal(normalized.opportunities[0]?.emoji, "🤝");
    assert.equal(normalized.header.buttonCount, 2);
  });

  it("exports Membership Toolkit HTML with opportunity anchors", () => {
    const state = buildInitialState(
      [
        {
          id: "e1",
          title: "Fair",
          description: "Welcome families.",
          date: "2026-08-08",
          time: null,
          imageUrl: null,
          volunteerSignupUrl: "https://www.signupgenius.com/go/fair",
        },
      ],
      "Test Org",
    );
    const html = exportVolunteerHtml(state);
    assert.match(html, /Volunteer With Us/);
    assert.match(html, /id="opportunities"/);
    assert.match(html, /signupgenius\.com\/go\/fair/);
    assert.match(html, /data-expires="2026-08-08"/);
  });
});
