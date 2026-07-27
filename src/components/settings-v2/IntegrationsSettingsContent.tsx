import { SettingsEaseIntegrations } from "@/components/settings-v2/SettingsEaseIntegrations";
import type { SettingsEaseIntegrationsData } from "@/lib/settings-v2/queries";

interface IntegrationsSettingsContentProps {
  data: SettingsEaseIntegrationsData;
}

export function IntegrationsSettingsContent({
  data,
}: IntegrationsSettingsContentProps) {
  return <SettingsEaseIntegrations data={data} />;
}
