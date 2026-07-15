import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";

export async function writeDeveloperToolAudit(input: {
  userId: string;
  organizationId: string;
  eventId: string;
  campaignWorkspaceId: string;
  milestoneId: string | null;
  actionType:
    | "clear_milestone_generated_content"
    | "clear_campaign_generated_content";
  artworkCleared: number;
  captionsCleared: number;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("developer_tool_audit_log").insert({
    user_id: input.userId,
    organization_id: input.organizationId,
    event_id: input.eventId,
    campaign_workspace_id: input.campaignWorkspaceId,
    milestone_id: input.milestoneId,
    action_type: input.actionType,
    artwork_cleared: input.artworkCleared,
    captions_cleared: input.captionsCleared,
  });

  if (error && !isMissingSchemaError(error)) {
    console.error("Failed to write developer tool audit log:", error.message);
  }
}
