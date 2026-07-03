import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioFeaturesPage } from "@/components/marketing/StudioFeaturesPage";

export const metadata = {
  title: "Features",
  description:
    "Explore CampaignOS — campaign planning, artwork studio, unified calendar, posting heatmap, team approvals, and Meta publishing for PTO teams.",
};

export default async function FeaturesPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <StudioFeaturesPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
