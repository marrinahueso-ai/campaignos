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
    imageUrl: null,
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
  it("hides Coming soon before on-date", () => {
    const vis = opportunityVisibility(role({}), "2026-07-27");
    assert.equal(vis.key, "soon");
    assert.equal(vis.label, "Coming soon");
    assert.equal(vis.show, false);
  });

  it("marks Open inside the window when a signup URL exists", () => {
    const vis = opportunityVisibility(role({}), "2026-08-05");
    assert.equal(vis.key, "open");
    assert.equal(vis.show, true);
    assert.equal(vis.dimmed, false);
  });

  it("hides Closed after off-date", () => {
    const vis = opportunityVisibility(role({}), "2026-08-11");
    assert.equal(vis.key, "closed");
    assert.equal(vis.label, "Closed");
    assert.equal(vis.show, false);
  });

  it("keeps always-on roles open on full month", () => {
    const vis = opportunityVisibility(
      role({ alwaysOn: true, startsOn: null, expiresOn: null }),
      PREVIEW_FULL_MONTH,
    );
    assert.equal(vis.key, "open");
    assert.equal(vis.show, true);
    assert.equal(vis.dimmed, false);
  });
});

describe("volunteer composer defaults + export", () => {
  it("builds opportunities from events with signup URLs and artwork", () => {
    const opp = opportunityFromEvent({
      id: "evt-1",
      title: "Book Fair",
      description: "Help shelve books and greet families at the fair.",
      date: "2026-09-12",
      time: "09:00",
      imageUrl: "https://cdn.example/bookfair.png",
      volunteerSignupUrl: "https://www.signupgenius.com/go/bookfair",
    });
    assert.equal(opp.eventId, "evt-1");
    assert.equal(opp.imageUrl, "https://cdn.example/bookfair.png");
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
    assert.equal(normalized.opportunities[0]?.imageUrl, null);
    assert.equal(normalized.header.buttonCount, 2);
  });

  it("exports Volunteer HTML with opportunity anchors and prominent artwork", () => {
    const state = buildInitialState(
      [
        {
          id: "e1",
          title: "Fair",
          description: "Welcome families.",
          date: "2026-08-08",
          time: null,
          imageUrl: "https://cdn.example/fair.png",
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
    assert.match(html, /cdn\.example\/fair\.png/);
    assert.match(html, /class="vol-art"/);
    assert.match(html, /vol-card-body/);
    assert.match(html, /aspect-ratio:1\/1/);
    assert.match(html, /text-align:center/);
    assert.match(html, /Browse events and programs below/);
    assert.doesNotMatch(html, /volunteerwithus/i);
    assert.doesNotMatch(html, /Membership Toolkit/i);
    assert.doesNotMatch(html, /On .+ → Off/);
    assert.doesNotMatch(html, /vol-window/);
  });

  it("hides closed roles from as-of export and omits on/off chrome", () => {
    const state = buildInitialState([], "Test Org");
    state.opportunities = [
      role({
        id: "open",
        title: "Open role",
        startsOn: "2026-08-01",
        expiresOn: "2026-08-10",
        imageUrl: "https://cdn.example/open.png",
      }),
      role({
        id: "closed",
        title: "Closed role",
        startsOn: "2026-07-01",
        expiresOn: "2026-07-15",
        imageUrl: "https://cdn.example/closed.png",
      }),
      role({
        id: "soon",
        title: "Future role",
        startsOn: "2026-09-01",
        expiresOn: "2026-09-10",
        imageUrl: "https://cdn.example/soon.png",
      }),
    ];
    const html = exportVolunteerHtml(state, { asOfDate: "2026-08-05" });
    assert.match(html, /Open role/);
    assert.doesNotMatch(html, /Closed role/);
    assert.doesNotMatch(html, /Future role/);
    assert.doesNotMatch(html, /On .+ → Off/);
    assert.doesNotMatch(html, /Sign-up closed/);
  });
});
