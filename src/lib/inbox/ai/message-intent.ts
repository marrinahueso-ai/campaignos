/** Returns true when the message is asking for information that org sources might answer. */
export function messageNeedsSourceAnswer(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }

  const lower = text.toLowerCase();

  if (isComplimentOrSocialComment(lower)) {
    return false;
  }

  const infoRequestPatterns = [
    /\?\s*$/,
    /\bhow\s+(?:do|can|to|much|many|long)\b/,
    /\bwhere\s+(?:do|can|is|are|to)\b/,
    /\bwhat\s+(?:is|are|time|date|day|cost|price)\b/,
    /\bwhen\s+(?:is|are|does|do|can|will)\b/,
    /\bwho\s+(?:is|are|do|can)\b/,
    /\bwhy\s+(?:is|are|do|does|can)\b/,
    /\b(can|could)\s+you\b/,
    /\bplease\s+(?:tell|send|share|let me know)\b/,
    /\b(?:do you|does anyone)\s+know\b/,
    /\b(?:need to know|looking for|trying to find|help me find|sign up|register for|find out)\b/,
    /\b(?:how much|cost|price|deadline|schedule|hours|location|address|phone number|email)\b/,
    /\b(?:lunch money|school bucks|bus route|bus stop|bus time|after.?school|before.?school|sacc|report card|attendance)\b/,
  ];

  return infoRequestPatterns.some((pattern) => pattern.test(lower));
}

function isComplimentOrSocialComment(lower: string): boolean {
  const hasQuestionMark = /\?/.test(lower);
  const hasInfoRequest =
    /\b(how|where|when|what time|what is|what are|can you|could you|please tell|do you know|need to know|looking for|sign up|register|find out|help me)\b/.test(
      lower,
    );

  if (hasQuestionMark || hasInfoRequest) {
    return false;
  }

  const praisePatterns = [
    /\b(?:thank you|thanks|thx|ty)\b/,
    /\b(?:great|awesome|amazing|love|loved|beautiful|wonderful|fantastic|fabulous|nice|good job|well done|way to go|so proud|keep up)\b/,
    /\b(?:looks great|looks amazing|looks wonderful|looks beautiful|looks awesome)\b/,
    /\bwhat a (?:great|beautiful|wonderful|amazing|fantastic|nice)\b/,
    /\b(?:feel like|feels like)\b.*\b(?:team|community|family)\b/,
    /\b(?:working to make|making things better|making a difference)\b/,
  ];

  return praisePatterns.some((pattern) => pattern.test(lower));
}
