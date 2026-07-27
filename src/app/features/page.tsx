import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioFeaturesPage } from "@/components/marketing/StudioFeaturesPage";

export const metadata = {
  title: "Features — See Hey Ralli in Action",
  description:
    "See how Hey Ralli turns school events into homepage HTML, family newsletters, social campaigns, approvals, volunteer clarity, Meta inbox replies, and clear next steps — for PTO, PTA, and community teams.",
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
