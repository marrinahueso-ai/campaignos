import type { InboxChannelType } from "@/lib/inbox/types";

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
