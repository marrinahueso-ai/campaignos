import "server-only";

import { countActiveOrganizationUsers } from "@/lib/auth/membership-queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import {
  getCanvaConnectionForCurrentOrg,
  isCanvaConnectionConfigured,
} from "@/lib/canva/connection";
import { isCanvaIntegrationConfigured } from "@/lib/canva/config";
import { getCustomInboxAiSources } from "@/lib/organizations/inbox-ai-sources/queries";
import { getOrganizationIntelligence } from "@/lib/organization-intelligence/queries";
import { WRITING_STYLES } from "@/lib/organization-intelligence/constants";
import { getSchoolProfile } from "@/lib/organizations/queries";
import {
  getMetaConnectionForCurrentOrg,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
import { getMondayConnectionForCurrentOrg } from "@/lib/monday/connection";
import { isMondayIntegrationConfigured } from "@/lib/monday/config";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";

export interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  manageHref: string;
  available: boolean;
}

export interface SettingsOverviewData {
  organizationName: string | null;
  organizationLocation: string | null;
  timezone: string | null;
  teamCount: number;
  activeIntegrationsCount: number;
  totalIntegrationsCount: number;
  planLabel: string;
  planRenewalLabel: string | null;
  isFoundingPartner: boolean;
  integrations: IntegrationStatus[];
  aiVoiceSnippet: string | null;
  writingStyleLabel: string | null;
  inboxSourcesCount: number;
  playbookCount: number;
}

function writingStyleLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return WRITING_STYLES.find((style) => style.value === value)?.label ?? value;
}

export async function getSettingsOverviewData(): Promise<SettingsOverviewData> {
  const [
    membership,
    schoolProfile,
    canvaConnection,
    metaConnection,
    mondayConnection,
  ] = await Promise.all([
    getActiveMembership(),
    getSchoolProfile(),
    getCanvaConnectionForCurrentOrg(),
    getMetaConnectionForCurrentOrg(),
    getMondayConnectionForCurrentOrg(),
  ]);

  const organization = schoolProfile?.organization ?? null;
  const organizationId = organization?.id ?? membership?.organizationId ?? null;

  const intelligence = organization
    ? await getOrganizationIntelligence(organization.id)
    : null;

  const teamCount = organizationId
    ? await countActiveOrganizationUsers(organizationId)
    : 0;

  const customSources = organizationId
    ? await getCustomInboxAiSources(organizationId)
    : [];
  const presetSourceCount = [
    organization?.eventsUrl,
    organization?.calendarUrl,
    organization?.resourcesUrl,
    organization?.faqUrl,
    organization?.schoolWebsite,
    organization?.ptoWebsite,
  ].filter(Boolean).length;
  const inboxSourcesCount = presetSourceCount + customSources.length;

  const playbooks = await getPlaybooksForOrganization(organizationId);
  const hasCalendarImport = Boolean(schoolProfile?.calendarImport);

  const integrations: IntegrationStatus[] = [
    {
      id: "canva",
      name: "Canva",
      description: "Import designs and assets",
      connected: isCanvaConnectionConfigured(canvaConnection),
      manageHref: "/settings/canva",
      available: isCanvaIntegrationConfigured(),
    },
    {
      id: "meta",
      name: "Meta (Facebook & Instagram)",
      description: "Publish and analytics",
      connected: isMetaConnectionConfigured(metaConnection),
      manageHref: "/settings/meta",
      available: isMetaIntegrationConfigured(),
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      description: "Events and deadlines",
      connected: hasCalendarImport,
      manageHref: "/settings/integrations",
      available: true,
    },
    {
      id: "monday",
      name: "Monday.com",
      description: "Project and task sync",
      connected: Boolean(mondayConnection?.accessToken),
      manageHref: "/settings/monday",
      available: isMondayIntegrationEnabled() && isMondayIntegrationConfigured(),
    },
  ];

  const activeIntegrations = integrations.filter((item) => item.connected);
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  return {
    organizationName: organization?.name ?? null,
    organizationLocation: organization?.district ?? null,
    timezone: organization?.timezone ?? null,
    teamCount,
    activeIntegrationsCount: activeIntegrations.length,
    totalIntegrationsCount: integrations.filter((item) => item.available).length,
    planLabel: isFoundingPartner ? "Founding Partner" : "Professional",
    planRenewalLabel: isFoundingPartner ? null : "Renews Aug 12, 2026",
    isFoundingPartner,
    integrations,
    aiVoiceSnippet: intelligence?.profile?.organizationVoice
      ? intelligence.profile.organizationVoice.slice(0, 160) +
        (intelligence.profile.organizationVoice.length > 160 ? "…" : "")
      : null,
    writingStyleLabel: writingStyleLabel(intelligence?.profile?.writingStyle ?? null),
    inboxSourcesCount,
    playbookCount: playbooks.length,
  };
}

export async function getIntegrationsSettingsData(): Promise<{
  active: IntegrationStatus[];
  available: IntegrationStatus[];
}> {
  const overview = await getSettingsOverviewData();

  const availableExtras: IntegrationStatus[] = [
    {
      id: "dropbox",
      name: "Dropbox",
      description: "Import files and assets",
      connected: false,
      manageHref: "/settings/integrations",
      available: true,
    },
    {
      id: "constant-contact",
      name: "Constant Contact",
      description: "Email marketing sync",
      connected: false,
      manageHref: "/settings/integrations",
      available: true,
    },
  ];

  const active = overview.integrations.filter((item) => item.connected);
  const available = [
    ...overview.integrations.filter((item) => !item.connected && item.available),
    ...availableExtras,
  ];

  return { active, available };
}
