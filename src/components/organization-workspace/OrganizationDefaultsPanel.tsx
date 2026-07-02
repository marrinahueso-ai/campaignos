import Link from "next/link";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { PLAYBOOK_SLUG_OPTIONS } from "@/lib/organization-workspace/constants";
import type { EventOrganizationDefaults } from "@/types/organization-workspace";

interface OrganizationDefaultsPanelProps {
  defaults: EventOrganizationDefaults;
}

function formatPlaybookSlug(slug: string | null): string {
  if (!slug) return "—";
  const match = PLAYBOOK_SLUG_OPTIONS.find((option) => option.value === slug);
  return match?.label ?? slug;
}

export function OrganizationDefaultsPanel({
  defaults,
}: OrganizationDefaultsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cos-bg-alt">
            <Info className="h-4 w-4 text-cos-muted" />
          </div>
          <div>
            <CardTitle>Organization Defaults</CardTitle>
            <CardDescription>
              From your organization workspace — read-only here. Edit in{" "}
              <Link
                href="/settings/organization"
                className="font-medium text-cos-accent hover:text-cos-muted"
              >
                Organization Settings
              </Link>
              .
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {defaults.responsibilities.map((item) => (
          <div key={item.label} className="rounded-lg bg-cos-bg px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-cos-text">
              {item.roleName}
            </dd>
          </div>
        ))}

        {defaults.committeeOwner && (
          <div className="rounded-lg bg-cos-bg px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Committee owner
            </dt>
            <dd className="mt-1 text-sm font-medium text-cos-text">
              {defaults.committeeOwner}
            </dd>
          </div>
        )}

        {defaults.communicationStrategy && (
          <div className="rounded-lg bg-cos-bg px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Communication strategy
            </dt>
            <dd className="mt-2">
              <Badge variant="info">
                {COMMUNICATION_STRATEGY_LABELS[defaults.communicationStrategy]}
              </Badge>
            </dd>
          </div>
        )}

        {defaults.playbookSlug && (
          <div className="rounded-lg bg-cos-bg px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Playbook
            </dt>
            <dd className="mt-1 text-sm font-medium text-cos-text">
              {formatPlaybookSlug(defaults.playbookSlug)}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
