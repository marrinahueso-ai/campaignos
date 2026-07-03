import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioPricingPage } from "@/components/marketing/StudioPricingPage";

export const metadata = {
  title: "Pricing",
  description:
    "Early access is free for PTO teams. Founding schools lock in $199/year per school before billing opens.",
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
