import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Building2,
  CheckCircle2,
  Crown,
  HelpCircle,
  Plug,
  Users,
} from "lucide-react";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import type { SettingsOverviewData } from "@/lib/settings-v2/queries";

interface SettingsOverviewContentProps {
  data: SettingsOverviewData;
}

function OverviewLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-cos-text transition-colors hover:text-cos-primary"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
    </Link>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  subvalue,
  href,
  linkLabel,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  value: string;
  subvalue?: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <SettingsV2Card>
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-cos-border bg-cos-bg p-2">
          <Icon className="h-5 w-5 text-cos-text" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
            {title}
          </p>
          <p className="mt-1 font-display text-xl text-cos-text">{value}</p>
          {subvalue ? (
            <p className="mt-0.5 text-sm text-cos-muted">{subvalue}</p>
          ) : null}
          <div className="mt-3">
            <OverviewLink href={href}>{linkLabel}</OverviewLink>
          </div>
        </div>
      </div>
    </SettingsV2Card>
  );
}

export function SettingsOverviewContent({ data }: SettingsOverviewContentProps) {
  const connectedIntegrations = data.integrations.filter((item) => item.connected);

  return (
    <div className="space-y-8">
      <SettingsV2PageHeader
        title="Settings"
        description="Manage your organization, team, integrations, AI preferences, and system settings."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Building2}
          title="Organization"
          value={data.organizationName ?? "Not set up"}
          subvalue={data.organizationLocation ?? undefined}
          href="/settings/organization"
          linkLabel="View profile"
        />
        <SummaryCard
          icon={Users}
          title="Team members"
          value={`${data.teamCount} Active users`}
          href="/settings/team-access"
          linkLabel="Manage team"
        />
        <SummaryCard
          icon={Plug}
          title="Active integrations"
          value={`${data.activeIntegrationsCount} Connected`}
          href="/settings/integrations"
          linkLabel="Manage integrations"
        />
        <SummaryCard
          icon={Crown}
          title="Plan"
          value={data.planLabel}
          subvalue={data.planRenewalLabel ?? (data.isFoundingPartner ? "Billing waived" : undefined)}
          href="/settings/billing-plan"
          linkLabel="Manage billing"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsV2Card
          title="Connected Integrations"
          footer={
            <OverviewLink href="/settings/integrations">View all integrations</OverviewLink>
          }
        >
          {connectedIntegrations.length === 0 ? (
            <p className="text-sm text-cos-muted">No integrations connected yet.</p>
          ) : (
            <ul className="divide-y divide-cos-border">
              {connectedIntegrations.map((integration) => (
                <li
                  key={integration.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-cos-text">{integration.name}</p>
                    <p className="text-xs text-cos-muted">{integration.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-700">Connected</span>
                    <Link href={integration.manageHref} aria-label={`Manage ${integration.name}`}>
                      <ArrowRight className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingsV2Card>

        <SettingsV2Card
          title="AI Brain Snapshot"
          footer={
            <OverviewLink href="/settings/ai-brain">Edit AI Brain settings</OverviewLink>
          }
        >
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-cos-accent" strokeWidth={1.5} />
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-cos-text">Your AI Brand Voice</p>
                <p className="mt-1 leading-relaxed text-cos-muted">
                  {data.aiVoiceSnippet ??
                    "Configure your organization voice so Hey Ralli writes in your school&apos;s tone."}
                </p>
              </div>
              <div>
                <p className="font-medium text-cos-text">Writing style</p>
                <p className="mt-0.5 text-cos-muted">
                  {data.writingStyleLabel ?? "Not configured"}
                </p>
              </div>
              <div>
                <p className="font-medium text-cos-text">Inbox AI sources</p>
                <p className="mt-0.5 text-cos-muted">
                  {data.inboxSourcesCount} sources connected
                </p>
              </div>
            </div>
          </div>
        </SettingsV2Card>

        <SettingsV2Card title="Quick Actions">
          <ul className="space-y-2 text-sm">
            {[
              { label: "Invite team member", href: "/settings/team-access" },
              { label: "Manage permissions", href: "/settings/team-access" },
              { label: "Add AI source", href: "/settings/inbox-ai" },
              { label: "Create new playbook", href: "/settings/playbooks-milestones" },
              { label: "Adjust posting schedule", href: "/settings/organization" },
              { label: "View system status", href: "/settings/advanced" },
            ].map((action) => (
              <li key={action.label}>
                <Link
                  href={action.href}
                  className="flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-cos-text transition-colors hover:border-cos-border hover:bg-cos-bg"
                >
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5 text-cos-muted" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
        </SettingsV2Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsV2Card
          title="Upcoming System Events"
          footer={
            <OverviewLink href="/settings/advanced">View all system settings</OverviewLink>
          }
        >
          <ul className="space-y-3 text-sm">
            {data.planRenewalLabel ? (
              <li className="flex items-center justify-between gap-3">
                <span className="text-cos-text">Plan renews {data.planRenewalLabel.replace("Renews ", "")}</span>
                <span className="text-xs font-medium text-amber-700">In 21 days</span>
              </li>
            ) : null}
            <li className="flex items-center justify-between gap-3">
              <span className="text-cos-text">Auto-backup: Daily at 2:00 AM</span>
              <span className="text-xs font-medium text-emerald-700">Active</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-cos-text">Data retention: 90 days</span>
              <span className="text-xs font-medium text-emerald-700">Active</span>
            </li>
          </ul>
        </SettingsV2Card>

        <SettingsV2Card title="Need Help?">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 h-5 w-5 text-cos-muted" strokeWidth={1.5} />
            <div className="space-y-3 text-sm">
              <p className="text-cos-muted">
                Visit the Help Center for guides and tutorials.
              </p>
              <ul className="space-y-2">
                {[
                  { label: "Help Center", href: "/help" },
                  { label: "Video tutorials", href: "/help" },
                  { label: "Contact support", href: "/help" },
                ].map((link) => (
                  <li key={link.label}>
                    <OverviewLink href={link.href}>{link.label}</OverviewLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SettingsV2Card>

        <SettingsV2Card
          title="Account Health"
          footer={
            <OverviewLink href="/settings/advanced">View status page</OverviewLink>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              <span className="font-medium">All systems operational</span>
            </div>
            <ul className="space-y-2 text-cos-muted">
              <li className="flex justify-between">
                <span>Inbox AI sources</span>
                <span className="font-medium text-cos-text">
                  {data.inboxSourcesCount}/{data.inboxSourcesCount} active
                </span>
              </li>
              <li className="flex justify-between">
                <span>Integrations</span>
                <span className="font-medium text-cos-text">
                  {data.activeIntegrationsCount}/{data.totalIntegrationsCount} healthy
                </span>
              </li>
              <li className="flex justify-between">
                <span>Team members</span>
                <span className="font-medium text-cos-text">{data.teamCount} active</span>
              </li>
            </ul>
          </div>
        </SettingsV2Card>
      </div>
    </div>
  );
}
