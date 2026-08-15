/**
 * Meta Send API expects `reply_to` as a **top-level** sibling of `message`
 * (not nested inside the message JSON). Nesting it causes invalid-parameter
 * failures or silent drop of the quote.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/send-messages/
 */
export function buildMessengerSendParams(input: {
  recipientId: string;
  message: Record<string, unknown>;
  replyToMid?: string | null;
  pageAccessToken: string;
}): Record<string, string> {
  const params: Record<string, string> = {
    recipient: JSON.stringify({ id: input.recipientId }),
    messaging_type: "RESPONSE",
    message: JSON.stringify(input.message),
    access_token: input.pageAccessToken,
  };
  const mid = input.replyToMid?.trim() || null;
  if (mid && !mid.startsWith("local:")) {
    // Top-level form field — Meta docs sample, not inside `message`.
    params.reply_to = JSON.stringify({ mid });
  }
  return params;
}

export function looksLikeReplyToFailure(
  error: string,
  errorCode?: number,
): boolean {
  const lower = error.toLowerCase();
  return (
    errorCode === 100 ||
    lower.includes("reply_to") ||
    lower.includes("reply to") ||
    (lower.includes("mid") && lower.includes("invalid"))
  );
}
