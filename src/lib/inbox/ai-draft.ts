import "server-only";

import { generateInboxReplyWithSources } from "@/lib/inbox/ai/generate-reply-with-sources";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";

export async function generateInboxAiDraft(input: {
  organizationId: string;
  thread: InboxThread;
  inboundMessage: InboxMessage;
}): Promise<{
  success: boolean;
  draftBody: string | null;
  aiSourceUsed: InboxAiSourceUsed | null;
  error: string | null;
}> {
  return generateInboxReplyWithSources(input);
}
