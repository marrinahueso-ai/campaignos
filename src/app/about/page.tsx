import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { StudioAboutPage } from "@/components/marketing/StudioAboutPage";

export const metadata = {
  title: "About",
  description:
    "How CampaignOS was created to help busy PTO volunteers manage school communications in one place.",
};

export default async function AboutPage() {
  const user = await getAuthUser();
  const workspaceHref = user ? await getAuthenticatedAppPath() : "/dashboard";

  return (
    <StudioAboutPage
      userEmail={user?.email ?? null}
      workspaceHref={workspaceHref}
    />
  );
}
