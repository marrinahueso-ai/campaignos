import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DELIVERY_METHOD,
  deliveryMethodUiLabel,
  isPublishNowDelivery,
  normalizeDeliveryMethod,
  wantsMetaFeedDelivery,
} from "../delivery-method.ts";

describe("delivery-method Publish Now", () => {
  it("defaults and normalizes legacy auto-publish to publish-now", () => {
    assert.equal(DEFAULT_DELIVERY_METHOD, "publish-now");
    assert.equal(normalizeDeliveryMethod("auto-publish"), "publish-now");
    assert.equal(normalizeDeliveryMethod("publish-now"), "publish-now");
    assert.equal(normalizeDeliveryMethod("schedule"), "schedule");
    assert.equal(normalizeDeliveryMethod(null), "publish-now");
  });

  it("labels Publish now clearly", () => {
    assert.equal(deliveryMethodUiLabel("publish-now"), "Publish now");
    assert.equal(deliveryMethodUiLabel("auto-publish"), "Publish now");
    assert.equal(deliveryMethodUiLabel("schedule"), "Schedule for later");
  });

  it("treats publish-now and legacy auto-publish as immediate Meta delivery", () => {
    assert.equal(isPublishNowDelivery("publish-now"), true);
    assert.equal(isPublishNowDelivery("auto-publish"), true);
    assert.equal(isPublishNowDelivery("schedule"), false);
    assert.equal(wantsMetaFeedDelivery("publish-now"), true);
    assert.equal(wantsMetaFeedDelivery("schedule"), true);
    assert.equal(wantsMetaFeedDelivery("draft-only"), false);
  });
});
