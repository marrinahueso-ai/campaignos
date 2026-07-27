import { SettingsEaseOverview } from "@/components/settings-v2/SettingsEaseOverview";
import { SETTINGS_TAB_REDIRECTS } from "@/components/settings-v2/settings-nav-config";
import { getSettingsEaseOverviewData } from "@/lib/settings-v2/queries";
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

  const data = await getSettingsEaseOverviewData();

  return <SettingsEaseOverview data={data} />;
}
