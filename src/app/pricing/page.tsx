import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioPricingPage } from "@/components/marketing/StudioPricingPage";

export const metadata = {
  title: "Pricing",
  description:
    "Early access is free for PTO teams. Founding schools lock in $799/year per school ($999/year at public launch) before billing opens.",
};

export default async function PricingPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <StudioPricingPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
