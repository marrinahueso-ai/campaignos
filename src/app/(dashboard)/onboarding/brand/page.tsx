import { OnboardingBrandForm } from "@/components/onboarding/OnboardingBrandForm";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Brand your school",
};

export default async function OnboardingBrandPage() {
  const profile = await getSchoolProfile();
  if (!profile?.organization) {
    redirect("/onboarding");
  }

  return (
    <OnboardingBrandForm
      initialPrimary={profile.brandAssets?.primaryColor ?? "#0F2E38"}
      initialSecondary={profile.brandAssets?.secondaryColor ?? "#DDBA4C"}
      initialMascot={profile.organization.mascot ?? ""}
    />
  );
}
