import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { MarketingWowAboutPage } from "@/components/marketing-wow/MarketingWowAboutPage";

export const metadata = {
  title: "About",
  description:
    "Hey Ralli was born from PTO board work — not a software company. Learn why one mom built a calm, connected workspace for school volunteers.",
};

export default async function AboutPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <MarketingWowAboutPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
