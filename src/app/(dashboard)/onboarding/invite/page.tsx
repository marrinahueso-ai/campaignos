import { OnboardingInviteForm } from "@/components/onboarding/OnboardingInviteForm";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Invite your team",
};

export default async function OnboardingInvitePage() {
  const organization = await getLatestOrganization();
  if (!organization) {
    redirect("/onboarding");
  }

  return <OnboardingInviteForm />;
}
