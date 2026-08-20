import { redirect } from "next/navigation";
import { SettingsEaseBranding } from "@/components/settings-v2/SettingsEaseBranding";
import { SchoolYearSettingsSection } from "@/components/settings/SchoolYearSettingsSection";
import { getSettingsEaseBrandingHubData } from "@/lib/settings-v2/queries";
import {
  brandingEaseDirectRoute,
  brandingEaseSectionFromParam,
} from "@/lib/settings-v2/settings-ease-branding-section";

export const metadata = {
  title: "Branding",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Settings Ease Branding hub — brand kit and school year nested here;
 * AI Inbox and Communication Plan deep-links redirect to shipped pages.
 */
export default async function BrandingSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const section = brandingEaseSectionFromParam(first(params.section));
  const directHref = brandingEaseDirectRoute(section);
  if (directHref) {
    redirect(directHref);
  }
  const data = await getSettingsEaseBrandingHubData();

  return (
    <SettingsEaseBranding
      section={section}
      data={data}
      schoolYearPanel={<SchoolYearSettingsSection embedded />}
    />
  );
}
