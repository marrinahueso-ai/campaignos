import { OnboardingBrandForm } from "@/components/onboarding/OnboardingBrandForm";
import { getBrandKitItems } from "@/lib/creative-assets/queries";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Brand kit",
};

interface OnboardingBrandPageProps {
  searchParams: Promise<{ standalone?: string; from?: string }>;
}

export default async function OnboardingBrandPage({
  searchParams,
}: OnboardingBrandPageProps) {
  const profile = await getSchoolProfile();
  if (!profile?.organization) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const standalone =
    params.standalone === "1" ||
    params.standalone === "true" ||
    params.from === "settings";

  const brandKitItems = await getBrandKitItems(profile.organization.id);
  const initialExtraLogos = brandKitItems
    .filter(
      (item) =>
        (item.category === "pto_logo" ||
          item.category === "school_logo" ||
          item.category === "other") &&
        Boolean(item.storagePath?.trim()),
    )
    .map((item) => {
      const url =
        resolveAssetImageUrl(item.storagePath) ?? item.storagePath ?? "";
      return {
        id: item.id,
        label: item.label,
        category: item.category as "pto_logo" | "school_logo" | "other",
        url,
      };
    })
    .filter((item) => item.url);

  return (
    <OnboardingBrandForm
      standalone={standalone}
      initialPrimary={profile.brandAssets?.primaryColor ?? "#0F2E38"}
      initialSecondary={profile.brandAssets?.secondaryColor ?? "#DDBA4C"}
      initialMascot={profile.organization.mascot ?? ""}
      initialPtoLogo={
        resolveAssetImageUrl(profile.brandAssets?.ptoLogo ?? null) ??
        profile.brandAssets?.ptoLogo ??
        null
      }
      initialSchoolLogo={
        resolveAssetImageUrl(profile.brandAssets?.schoolLogo ?? null) ??
        profile.brandAssets?.schoolLogo ??
        null
      }
      initialExtraLogos={initialExtraLogos}
    />
  );
}
