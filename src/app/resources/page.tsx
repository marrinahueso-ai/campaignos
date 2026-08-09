import { Suspense } from "react";
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
    <Suspense fallback={<ResourcesPageFallback />}>
      <MarketingWowResourcesPage
        userEmail={user?.email ?? null}
        workspaceHref={workspaceHref}
        dashboardCtaLabel={dashboardCtaLabel}
      />
    </Suspense>
  );
}

function ResourcesPageFallback() {
  return (
    <div className="min-h-[50vh] bg-cos-bg px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="mx-auto h-12 w-2/3 animate-pulse rounded bg-cos-border/40" />
        <div className="mx-auto h-5 w-1/2 animate-pulse rounded bg-cos-border/30" />
        <div className="mx-auto mt-8 h-14 w-full max-w-xl animate-pulse rounded-full bg-cos-border/30" />
      </div>
    </div>
  );
}
