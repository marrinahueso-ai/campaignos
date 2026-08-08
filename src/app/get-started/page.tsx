import type { Metadata } from "next";
import { MarketingWowGetStartedPage } from "@/components/marketing-wow/MarketingWowGetStartedPage";
import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";

export const metadata: Metadata = {
  title: "Get Started | Hey Ralli",
  description:
    "Start your free Hey Ralli trial. Create a school, join your team, or activate Founding School access.",
};

export default async function GetStartedPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <MarketingWowGetStartedPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
