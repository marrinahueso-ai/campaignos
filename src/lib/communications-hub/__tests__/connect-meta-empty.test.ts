import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("Communications Connect Meta Ease empty", () => {
  const empty = readSrc(
    "../../../components/communications-hub/ConnectMetaEmpty.tsx",
  );
  const hub = readSrc(
    "../../../components/communications-hub/CommunicationsHub.tsx",
  );
  const inboxHub = readSrc("../../../components/inbox/InboxHub.tsx");
  const featureList = readSrc("../../../../docs/product/feature-list.md");

  it("matches mockup purpose cards, CTAs, and messaging permissions link", () => {
    assert.match(empty, /Connect Meta to get started/);
    assert.match(empty, /Why we connect/);
    assert.match(empty, /What AI does/);
    assert.match(empty, /What we don’t do/);
    assert.match(empty, /Privacy/);
    assert.match(empty, /Facebook Page Inbox/);
    assert.match(empty, /Instagram DMs/);
    assert.match(empty, /No ads inbox/);
    assert.match(empty, /No Messenger[\s\S]*marketing blasts/);
    assert.match(empty, /No cold outreach/);
    assert.match(empty, /Connect with Facebook/);
    assert.match(empty, /Meta settings/);
    assert.match(empty, /Why we ask for Page messaging permissions/);
    assert.match(empty, /buildMetaOAuthStartPath/);
    assert.match(empty, /buildIntegrationSettingsPath/);
  });

  it("wires ConnectMetaEmpty into Communications Hub and Inbox empty states", () => {
    assert.match(hub, /ConnectMetaEmpty/);
    assert.match(hub, /returnTo="\/communications"/);
    assert.doesNotMatch(
      hub,
      /showConnectionEmptyState \? \(\s*<EmptyState[\s\S]*Connect Meta to get started/,
    );
    assert.match(inboxHub, /ConnectMetaEmpty/);
    assert.match(inboxHub, /returnTo="\/communications"/);
  });

  it("marks Communications Connect Meta Ease as shipped in feature-list", () => {
    assert.match(
      featureList,
      /Communications Connect Meta Ease[^]*?\*\*shipped\*\*/,
    );
  });
});
