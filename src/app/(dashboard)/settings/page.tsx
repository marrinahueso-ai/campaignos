import { SettingsOverviewContent } from "@/components/settings-v2/SettingsOverviewContent";
import { SETTINGS_TAB_REDIRECTS } from "@/components/settings-v2/settings-nav-config";
import { getSettingsOverviewData } from "@/lib/settings-v2/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings",
};

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const tab = params.tab?.trim().toLowerCase();

  if (tab) {
    const destination = SETTINGS_TAB_REDIRECTS[tab];
    if (destination) {
      redirect(destination);
    }
  }

  const data = await getSettingsOverviewData();

  return <SettingsOverviewContent data={data} />;
}
