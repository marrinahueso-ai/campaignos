import { IntegrationLogo } from "@/components/settings-v2/IntegrationLogo";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { IntegrationStatus } from "@/lib/settings-v2/integration-types";

interface IntegrationsSettingsContentProps {
  integrations: IntegrationStatus[];
}

function IntegrationRow({ integration }: { integration: IntegrationStatus }) {
  const actionLabel = integration.comingSoon
    ? "Coming soon"
    : integration.connected
      ? "Manage"
      : "Connect";

  return (
    <div className="flex flex-col gap-3 border-b border-cos-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <IntegrationLogo id={integration.id} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-cos-text">{integration.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-cos-muted">
            {integration.description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:pl-0 pl-[3.25rem]">
        <Badge variant={integration.connected ? "success" : "default"}>
          {integration.connected ? "Connected" : "Not connected"}
        </Badge>
        {integration.comingSoon ? (
          <Button variant="secondary" size="sm" disabled>
            {actionLabel}
          </Button>
        ) : (
          <Button href={integration.manageHref} variant="secondary" size="sm">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function IntegrationsSettingsContent({
  integrations,
}: IntegrationsSettingsContentProps) {
  const connectedCount = integrations.filter((integration) => integration.connected).length;

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Integrations"
        description="Connect once per tool — approve the use cases, then Hey Ralli uses that connection across the app."
      />

      <SettingsV2Card
        title="Integrations"
        description={`${connectedCount} connected · ${integrations.length} available`}
      >
        {integrations.length === 0 ? (
          <p className="text-sm text-cos-muted">No integrations available yet.</p>
        ) : (
          integrations.map((integration) => (
            <IntegrationRow key={integration.id} integration={integration} />
          ))
        )}
      </SettingsV2Card>
    </div>
  );
}
