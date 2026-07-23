import assert from "node:assert/strict";
import { test } from "node:test";
import { getJumboEmojiCount } from "../jumbo-emoji.ts";

test("single emoji is jumbo size 1", () => {
  assert.equal(getJumboEmojiCount("🤨"), 1);
  assert.equal(getJumboEmojiCount("  ❤️  "), 1);
  assert.equal(getJumboEmojiCount("👍🏽"), 1);
  assert.equal(getJumboEmojiCount("👨‍👩‍👧‍👦"), 1);
  assert.equal(getJumboEmojiCount("🇨🇦"), 1);
  assert.equal(getJumboEmojiCount("1️⃣"), 1);
});

test("two or three emoji are jumbo size 2–3", () => {
  assert.equal(getJumboEmojiCount("😂😂"), 2);
  assert.equal(getJumboEmojiCount("🔥🎉✨"), 3);
});

test("four emoji or mixed text are not jumbo", () => {
  assert.equal(getJumboEmojiCount("😂😂😂😂"), null);
  assert.equal(getJumboEmojiCount("hi 🤨"), null);
  assert.equal(getJumboEmojiCount("🤨!"), null);
  assert.equal(getJumboEmojiCount("a"), null);
  assert.equal(getJumboEmojiCount(""), null);
  assert.equal(getJumboEmojiCount("   "), null);
  assert.equal(getJumboEmojiCount("😂 😂"), null);
});
