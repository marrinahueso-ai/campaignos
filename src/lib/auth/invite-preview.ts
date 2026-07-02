import { getInviteByToken } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";

export async function getInvitePreview(token: string) {
  const invite = await getInviteByToken(token);
  if (!invite) {
    return null;
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invite.organizationId)
    .maybeSingle();

  return {
    organizationName: org?.name ?? "your PTO",
    email: invite.email,
    roleName: invite.organizationRoleName,
    campaignRole: invite.campaignRole,
  };
}
