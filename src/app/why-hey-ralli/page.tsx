import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { MarketingWowWhyPage } from "@/components/marketing-wow/MarketingWowWhyPage";

export const metadata = {
  title: "Why Hey Ralli",
  description:
    "Your PTO doesn't need another tool. It needs fewer of them. See how Hey Ralli connects planning, AI drafting, volunteers, approvals, and publishing into one calm workspace.",
};

export default async function WhyHeyRalliPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <MarketingWowWhyPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
