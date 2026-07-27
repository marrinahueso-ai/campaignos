import { IntegrationsSettingsContent } from "@/components/settings-v2/IntegrationsSettingsContent";
import { getIntegrationsSettingsData } from "@/lib/settings-v2/queries";

export const metadata = {
  title: "Integrations",
};

export default async function IntegrationsSettingsPage() {
  const { ease } = await getIntegrationsSettingsData();

  return <IntegrationsSettingsContent data={ease} />;
}
