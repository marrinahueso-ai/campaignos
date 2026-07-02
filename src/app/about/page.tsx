import { getAuthUser } from "@/lib/auth/queries";
import { StudioAboutPage } from "@/components/marketing/StudioAboutPage";

export const metadata = {
  title: "About",
  description:
    "How CampaignOS was created to help busy PTO volunteers manage school communications in one place.",
};

export default async function AboutPage() {
  const user = await getAuthUser();

  return <StudioAboutPage userEmail={user?.email ?? null} />;
}
