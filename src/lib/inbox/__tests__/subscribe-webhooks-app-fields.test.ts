import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard: Meta only delivers webhook fields present at BOTH
 * app (/subscriptions) and Page (subscribed_apps) levels. A prior cutover
 * left app fields empty while Page fields looked correct — DMs never arrived.
 */
describe("subscribeMetaInboxWebhooks / ensureMetaAppWebhookSubscriptions", () => {
  const src = readFileSync(
    join(process.cwd(), "src/lib/inbox/sync/subscribe-webhooks.ts"),
    "utf8",
  );

  it("exports ensureMetaAppWebhookSubscriptions and posts /subscriptions", () => {
    expect(src).toContain("export async function ensureMetaAppWebhookSubscriptions");
    expect(src).toContain("`/${appId}/subscriptions`");
    expect(src).toContain('object: "page"');
    expect(src).toContain('object: "instagram"');
    for (const field of [
      "messages",
      "messaging_postbacks",
      "message_deliveries",
      "message_reads",
      "standby",
      "feed",
      "comments",
    ]) {
      expect(src).toContain(`"${field}"`);
    }
  });

  it("subscribeMetaInboxWebhooks ensures app fields before Page subscribed_apps", () => {
    const fnStart = src.indexOf("export async function subscribeMetaInboxWebhooks");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = src.slice(fnStart);
    const ensureCall = fnBody.indexOf("await ensureMetaAppWebhookSubscriptions()");
    const pageSubscribe = fnBody.indexOf("`/${input.pageId}/subscribed_apps`");
    expect(ensureCall).toBeGreaterThan(-1);
    expect(pageSubscribe).toBeGreaterThan(-1);
    expect(ensureCall).toBeLessThan(pageSubscribe);
  });

  it("does not POST subscribed_apps on the Instagram Business Account id", () => {
    // That Graph edge does not exist on IG BA nodes and previously made
    // subscribeMetaInboxWebhooks report failure even when Page + app fields succeeded.
    expect(src).not.toContain("`/${input.instagramAccountId}/subscribed_apps`");
  });

  it("validates Instagram app webhook fields after listing subscriptions", () => {
    expect(src).toContain("App Instagram webhook missing fields");
  });
});
