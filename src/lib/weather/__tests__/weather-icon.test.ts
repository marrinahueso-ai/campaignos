import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { weatherIconKindFromCondition } from "../../../components/today/widgets/WeatherConditionIcon.tsx";

describe("weatherIconKindFromCondition", () => {
  it("maps common conditions", () => {
    assert.equal(weatherIconKindFromCondition("Sunny"), "sunny");
    assert.equal(weatherIconKindFromCondition("Clear"), "sunny");
    assert.equal(weatherIconKindFromCondition("Partly cloudy"), "partly_cloudy");
    assert.equal(weatherIconKindFromCondition("Clouds"), "partly_cloudy");
    assert.equal(weatherIconKindFromCondition("Rainy"), "rainy");
    assert.equal(weatherIconKindFromCondition("Snowy"), "snowy");
    assert.equal(weatherIconKindFromCondition("Storms"), "stormy");
    assert.equal(weatherIconKindFromCondition("Foggy"), "foggy");
    assert.equal(weatherIconKindFromCondition("Light breeze"), "breezy");
  });
});
