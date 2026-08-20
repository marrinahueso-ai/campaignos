import Link from "next/link";
import type { SettingsEaseOverviewData } from "@/lib/settings-v2/queries";

interface SettingsEaseOverviewProps {
  data: SettingsEaseOverviewData;
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "off";
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        tone === "ok"
          ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]"
          : "inline-flex items-center gap-1.5 rounded-full bg-[rgba(122,113,102,0.12)] px-2.5 py-1 text-xs font-bold text-[#7a7166]"
      }
    >
      {tone === "ok" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

function SummaryCard({
  eyebrow,
  value,
  sub,
  linkLabel,
  href,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="summary-card block rounded-[18px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] p-4 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(42,38,34,0.12)]"
    >
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7a7166]">
        {eyebrow}
      </div>
      <div
        className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-[#2a2622]"
        style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[13px] text-[#5c554c]">{sub}</div>
      <div className="mt-3 text-[13px] font-bold text-[#2f4a3c]">{linkLabel}</div>
    </Link>
  );
}

function SoftCard({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            {title}
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            {description}
          </p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex items-center rounded-full border border-transparent bg-transparent px-3 py-2 text-[13px] font-bold text-[#5c554c] transition-colors hover:text-[#2a2622]"
        >
          {actionLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-[rgba(42,38,34,0.1)] py-[11px] text-sm last:border-b-0">
      <span className="text-[#7a7166]">{label}</span>
      <span className="text-right font-semibold text-[#2a2622]">{children}</span>
    </div>
  );
}

export function SettingsEaseOverview({ data }: SettingsEaseOverviewProps) {
  return (
    <section className="settings-ease-overview" data-settings-ease="overview">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Settings
          </h1>
          <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
            Organization, team, connections, and billing — kept calm and easy to
            find.
          </p>
        </div>
      </div>

      <div className="mb-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          eyebrow="Organization"
          value={data.organizationShortName}
          sub={data.organizationLocationLine}
          linkLabel="View profile →"
          href="/settings/organization"
        />
        <SummaryCard
          eyebrow="Team"
          value={`${data.teamCount} active`}
          sub={
            data.pendingInviteCount === 1
              ? "1 invite pending"
              : `${data.pendingInviteCount} invites pending`
          }
          linkLabel="Manage team →"
          href="/settings/team-access"
        />
        <SummaryCard
          eyebrow="Integrations"
          value={`${data.activeIntegrationsCount} connected`}
          sub={data.connectedIntegrationsLabel}
          linkLabel="Manage connections →"
          href="/settings/integrations"
        />
        <SummaryCard
          eyebrow="Plan"
          value={data.planLabel}
          sub={data.planSubLabel}
          linkLabel="Manage billing →"
          href="/settings/billing-plan"
        />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <SoftCard
          title="Connected"
          description="Tools ready for your active year."
          actionHref="/settings/integrations"
          actionLabel="View all"
        >
          <DetailRow label="Facebook & Instagram">
            <StatusPill tone={data.metaConnected ? "ok" : "off"}>
              {data.metaConnected ? "Connected" : "Not connected"}
            </StatusPill>
          </DetailRow>
          <DetailRow label="Google Calendar">
            <StatusPill tone={data.googleCalendarConnected ? "ok" : "off"}>
              {data.googleCalendarConnected ? "Connected" : "Not connected"}
            </StatusPill>
          </DetailRow>
        </SoftCard>

        <SoftCard
          title="Branding"
          description="Inbox sources, communication plans, brand kit, school year."
          actionHref="/settings/branding"
          actionLabel="Open"
        >
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[rgba(47,74,60,0.14)] bg-[rgba(47,74,60,0.08)] px-3.5 py-2 text-[13px] font-bold text-[#2f4a3c]">
            Active year · {data.schoolYearLabel}
          </div>
          <DetailRow label="Inbox sources">
            {data.inboxSourcesCount === 1
              ? "1 active"
              : `${data.inboxSourcesCount} active`}
          </DetailRow>
          <DetailRow label="Brand kit">
            {data.brandKitReady ? "Colors · logos set" : "Not set"}
          </DetailRow>
        </SoftCard>
      </div>
    </section>
  );
}
