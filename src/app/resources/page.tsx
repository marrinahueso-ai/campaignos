import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath, ONBOARDING_PATH } from "@/lib/auth/post-auth-path";
import { MarketingWowResourcesPage } from "@/components/marketing-wow/MarketingWowResourcesPage";

export const metadata = {
  title: "Resources",
  description:
    "Guides, tutorials, and answers for Hey Ralli — getting started, calendar import, Create with AI, volunteers, approvals, and billing.",
};

export default async function ResourcesPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";
  const dashboardCtaLabel =
    workspaceHref === ONBOARDING_PATH ? "Continue setup" : "Open your dashboard";

  return (
    <MarketingWowResourcesPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
      dashboardCtaLabel={dashboardCtaLabel}
    />
  );
}
