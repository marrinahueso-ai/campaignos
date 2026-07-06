import type { InboxChannelType } from "@/lib/inbox/types";

const FORMAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/For information about\s+/gi, ""],
  [/For more information(?: about this)?,?\s*/gi, ""],
  [
    /Please visit (?:this link|our website|the link|the page)(?: for more (?:details|information))?(?: at)?[:.]?\s*/gi,
    "Here's the page: ",
  ],
  [
    /You can (?:find|check out|visit) (?:details|more information|information) (?:at|on|by visiting)\s+/gi,
    "Here's ",
  ],
  [/You can check out\s+/gi, "Check out "],
  [/Visit (https?:\/\/\S+)/gi, "here's the page: $1"],
  [
    /(?:Please )?visit (?:our (?:website|page) )?(?:at )?(https?:\/\/\S+)/gi,
    "here's the page: $1",
  ],
  [/\bat (https?:\/\/\S+)/gi, "$1"],
];

/** Rewrites stiff phrasing the model sometimes echoes from source excerpts. */
export function humanizeInboxDraft(text: string): string {
  let result = text.trim();

  for (const [pattern, replacement] of FORMAL_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

/** Deterministic follow-up when no verified answer exists on configured sources. */
export function buildFollowUpDraft(input: {
  senderName?: string | null;
  organizationName?: string | null;
  channelType: InboxChannelType;
}): string {
  const greeting = input.senderName?.trim()
    ? `Hey ${input.senderName.trim()}!`
    : "Hey!";

  switch (input.channelType) {
    case "instagram_dm":
    case "facebook_message":
      return `${greeting} Good question — I'm checking on this and we'll get back to you soon!`;
    case "instagram_comment":
    case "facebook_comment":
      return `Good question! I'm checking on this and we'll follow up soon.`;
    default:
      return `${greeting} Good question — I'm checking on this and we'll get back to you soon!`;
  }
}

/** Returns true when fetched page text looks like a login/auth wall rather than content. */
export function isLikelyAuthWall(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < 80) {
    return true;
  }

  const authPatterns = [
    /\b(sign in|log in|login required|member login|members only)\b/,
    /\b(please log in|please sign in|authentication required)\b/,
    /\b(access denied|unauthorized|forbidden)\b/,
  ];

  const authHits = authPatterns.filter((pattern) => pattern.test(normalized)).length;
  return authHits >= 2 || (authHits >= 1 && normalized.length < 400);
}
