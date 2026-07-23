#!/usr/bin/env node
/**
 * Smoke tests for Communications Hub → Meta reaction mapping.
 * Run: node scripts/test-inbox-send-reaction.mjs
 */

function channelSupportsMetaReaction(channelType) {
  return (
    channelType === "instagram_dm" ||
    channelType === "facebook_message" ||
    channelType === "instagram_comment" ||
    channelType === "facebook_comment"
  );
}

function commentReactionMapsToLike(reaction) {
  return reaction === "❤️";
}

function isBenignCommentLikeStateError(graphError) {
  const lower = graphError.toLowerCase();
  return (
    lower.includes("already been liked") ||
    lower.includes("already liked") ||
    lower.includes("has not been liked") ||
    lower.includes("not been liked") ||
    lower.includes("user hasn't liked")
  );
}

function resolveMetaReaction({ channelType, reaction }) {
  if (!channelSupportsMetaReaction(channelType)) {
    return { localOnly: true, metaReaction: null, mappedToLike: false };
  }
  if (
    channelType === "facebook_comment" ||
    channelType === "instagram_comment"
  ) {
    return {
      localOnly: false,
      metaReaction: reaction ? "LIKE" : null,
      mappedToLike: commentReactionMapsToLike(reaction),
    };
  }
  return {
    localOnly: false,
    metaReaction: reaction,
    mappedToLike: false,
  };
}

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}`);
  }
}

console.log("inbox send-reaction mapping");

assert(
  "facebook_comment ❤️ → LIKE + mapped",
  (() => {
    const r = resolveMetaReaction({
      channelType: "facebook_comment",
      reaction: "❤️",
    });
    return r.metaReaction === "LIKE" && r.mappedToLike && !r.localOnly;
  })(),
);

assert(
  "facebook_comment 👍 → LIKE without heart mapping flag",
  (() => {
    const r = resolveMetaReaction({
      channelType: "facebook_comment",
      reaction: "👍",
    });
    return r.metaReaction === "LIKE" && !r.mappedToLike;
  })(),
);

assert(
  "instagram_dm ❤️ → emoji react",
  (() => {
    const r = resolveMetaReaction({
      channelType: "instagram_dm",
      reaction: "❤️",
    });
    return r.metaReaction === "❤️" && !r.mappedToLike && !r.localOnly;
  })(),
);

assert(
  "facebook_tag → local only",
  (() => {
    const r = resolveMetaReaction({
      channelType: "facebook_tag",
      reaction: "👍",
    });
    return r.localOnly && r.metaReaction == null;
  })(),
);

assert(
  "benign already-liked error",
  isBenignCommentLikeStateError(
    "Error validating access token: (#100) Object has already been liked",
  ),
);

assert(
  "real permission error is not benign",
  !isBenignCommentLikeStateError("(#200) Permissions error"),
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
