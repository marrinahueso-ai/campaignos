import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioPricingPage } from "@/components/marketing/StudioPricingPage";

export const metadata = {
  title: "Pricing",
  description:
    "Hey Ralli plans for PTO teams — Starter $49, Professional $79, Premium $129 — with AI credits included.",
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
