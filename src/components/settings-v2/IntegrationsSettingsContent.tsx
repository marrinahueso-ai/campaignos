import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { IntegrationStatus } from "@/lib/settings-v2/queries";

interface IntegrationsSettingsContentProps {
  active: IntegrationStatus[];
  available: IntegrationStatus[];
}

function IntegrationRow({
  integration,
  actionLabel,
}: {
  integration: IntegrationStatus;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-cos-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-cos-text">{integration.name}</p>
        <p className="text-xs text-cos-muted">{integration.description}</p>
      </div>
      <div className="flex items-center gap-3">
        {integration.connected ? (
          <Badge variant="success">Connected</Badge>
        ) : (
          <Badge variant="default">Not connected</Badge>
        )}
        <Button href={integration.manageHref} variant="secondary" size="sm">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function IntegrationsSettingsContent({
  active,
  available,
}: IntegrationsSettingsContentProps) {
  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Integrations"
        description="Connect the tools your PTO already uses. OAuth flows stay on their existing routes."
      />

      <SettingsV2Card title="Active Integrations">
        {active.length === 0 ? (
          <p className="text-sm text-cos-muted">No active integrations yet.</p>
        ) : (
          active.map((integration) => (
            <IntegrationRow
              key={integration.id}
              integration={integration}
              actionLabel="Manage"
            />
          ))
        )}
      </SettingsV2Card>

      <SettingsV2Card
        title="Available Integrations"
        footer={
          <p className="text-xs text-cos-muted">
            Gmail and additional connectors are planned — connect buttons route to
            existing handlers where available.
          </p>
        }
      >
        {available.map((integration) => (
          <IntegrationRow
            key={integration.id}
            integration={integration}
            actionLabel={integration.id === "dropbox" || integration.id === "constant-contact" ? "Coming soon" : "Connect"}
          />
        ))}
      </SettingsV2Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Canva settings", href: "/settings/canva" },
          { label: "Meta settings", href: "/settings/meta" },
          { label: "Monday settings", href: "/settings/monday" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="cos-card cos-card-interactive flex items-center justify-between px-4 py-3 text-sm font-medium text-cos-text"
          >
            {link.label}
            <ArrowRight className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
          </Link>
        ))}
      </div>
    </div>
  );
}
