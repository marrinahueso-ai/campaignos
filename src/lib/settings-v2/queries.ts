import "server-only";

import {
  countActiveOrganizationUsers,
  countPendingOrganizationInvites,
  getActiveMembership,
} from "@/lib/auth/membership-queries";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import {
  getCanvaConnectionForCurrentOrg,
  isCanvaConnectionConfigured,
} from "@/lib/canva/connection";
import { isCanvaIntegrationConfigured } from "@/lib/canva/config";
import { parseSchoolYearRange } from "@/lib/calendar-import/extract-date-lines";
import { getCustomInboxAiSources } from "@/lib/organizations/inbox-ai-sources/queries";
import { getOrganizationIntelligence } from "@/lib/organization-intelligence/queries";
import { WRITING_STYLES } from "@/lib/organization-intelligence/constants";
import { getSchoolProfile } from "@/lib/organizations/queries";
import { getInboxConnectionStatus } from "@/lib/inbox/queries";
import {
  getMetaConnectionForCurrentOrg,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
import { getMondayConnectionForCurrentOrg } from "@/lib/monday/connection";
import { isMondayIntegrationConfigured } from "@/lib/monday/config";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";
import {
  getGoogleCalendarConnectionForCurrentOrg,
  isGoogleCalendarConnectionConfigured,
} from "@/lib/google-calendar/connection";
import { isGoogleCalendarIntegrationConfigured } from "@/lib/google-calendar/config";
import { planById } from "@/lib/billing/plan-catalog";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { IntegrationStatus } from "@/lib/settings-v2/integration-types";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type { SettingsEaseBrandingHubData } from "@/lib/settings-v2/settings-ease-branding-section";

export type { IntegrationId, IntegrationStatus } from "@/lib/settings-v2/integration-types";
export type { SettingsEaseBrandingHubData } from "@/lib/settings-v2/settings-ease-branding-section";

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

/** Ease Overview hub — exact Settings Ease mockup fields. */
export interface SettingsEaseOverviewData {
  organizationShortName: string;
  organizationLocationLine: string;
  teamCount: number;
  pendingInviteCount: number;
  activeIntegrationsCount: number;
  connectedIntegrationsLabel: string;
  planLabel: string;
  planSubLabel: string;
  metaConnected: boolean;
  googleCalendarConnected: boolean;
  canvaConnected: boolean;
  schoolYearLabel: string;
  schoolYearStartsLabel: string;
  schoolYearEndsLabel: string;
  calendarFeedSaved: boolean;
  writingStyleLabel: string | null;
  inboxSourcesCount: number;
  brandKitReady: boolean;
  aiBrainStatusLabel: string;
}

function writingStyleLabel(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return WRITING_STYLES.find((style) => style.value === value)?.label ?? value;
}

function shortenOrganizationName(name: string | null): string {
  if (!name?.trim()) return "Not set up";
  return name
    .trim()
    .replace(/\s+Elementary\s+/i, " ")
    .replace(/\s+Middle\s+/i, " ")
    .replace(/\s+High\s+/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatSchoolYearDate(month: number, day: number, year: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function schoolYearDateLabels(label: string | null | undefined): {
  starts: string;
  ends: string;
} {
  const range = parseSchoolYearRange(label);
  if (!range) {
    return { starts: "—", ends: "—" };
  }
  return {
    starts: formatSchoolYearDate(8, 1, range.startYear),
    ends: formatSchoolYearDate(7, 31, range.endYear),
  };
}

async function loadSettingsOverviewBundle() {
  const [
    membership,
    schoolProfile,
    canvaConnection,
    metaConnection,
    mondayConnection,
    googleCalendarConnection,
  ] = await Promise.all([
    getActiveMembership(),
    getSchoolProfile(),
    getCanvaConnectionForCurrentOrg(),
    getMetaConnectionForCurrentOrg(),
    getMondayConnectionForCurrentOrg(),
    getGoogleCalendarConnectionForCurrentOrg(),
  ]);

  const organization = schoolProfile?.organization ?? null;
  const organizationId = organization?.id ?? membership?.organizationId ?? null;

  const intelligence = organization
    ? await getOrganizationIntelligence(organization.id)
    : null;

  const [teamCount, pendingInviteCount] = await Promise.all([
    organizationId ? countActiveOrganizationUsers(organizationId) : Promise.resolve(0),
    organizationId
      ? countPendingOrganizationInvites(organizationId)
      : Promise.resolve(0),
  ]);

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
  const activeSchoolYear = organizationId
    ? await getActiveSchoolYear(organizationId)
    : null;
  const hasCalendarSubscribeFeed = Boolean(
    activeSchoolYear?.calendarSubscribeUrl?.trim(),
  );
  const hasCalendarImport = Boolean(schoolProfile?.calendarImport);

  const integrations: IntegrationStatus[] = [
    {
      id: "meta",
      name: "Facebook & Instagram",
      description:
        "Connect your Facebook Page and linked Instagram account to publish posts, reply in inbox, and pull Insights.",
      connected: isMetaConnectionConfigured(metaConnection),
      manageHref: "/settings/meta",
      available: true,
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      description:
        "Sign in with Google to sync school events. File upload and import review stay on Calendar → Import.",
      connected:
        isGoogleCalendarConnectionConfigured(googleCalendarConnection) ||
        hasCalendarSubscribeFeed ||
        hasCalendarImport,
      manageHref: "/settings/integrations/calendar",
      available: true,
    },
    {
      id: "canva",
      name: "Canva",
      description: "Import designs as inspiration images for Creative Setup.",
      connected: isCanvaConnectionConfigured(canvaConnection),
      manageHref: "/settings/canva",
      available: true,
    },
    {
      id: "monday",
      name: "Monday.com",
      description: "Optional task sync for boards you already use.",
      connected: Boolean(mondayConnection?.accessToken),
      manageHref: "/settings/monday",
      available: true,
    },
    {
      id: "google-inbox",
      name: "Gmail",
      description: "Deferred — not available in soft launch.",
      connected: false,
      manageHref: "/settings/integrations",
      available: true,
      comingSoon: true,
    },
    {
      id: "dropbox",
      name: "Dropbox",
      description: "Deferred — not available in soft launch.",
      connected: false,
      manageHref: "/settings/integrations",
      available: true,
      comingSoon: true,
    },
    {
      id: "signup-genius",
      name: "SignUpGenius",
      description: "Deferred — not available in soft launch.",
      connected: false,
      manageHref: "/settings/integrations",
      available: true,
      comingSoon: true,
    },
    {
      id: "constant-contact",
      name: "Constant Contact",
      description: "Email marketing sync",
      connected: false,
      manageHref: "/settings/integrations",
      available: true,
      comingSoon: true,
    },
  ];

  const activeIntegrations = integrations.filter((item) => item.connected);
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  let planLabel = isFoundingPartner ? "Founding Partner" : "Professional";
  let planRenewalLabel: string | null = null;
  let planPriceUsd: number | null = isFoundingPartner
    ? null
    : planById("professional").priceUsd;
  let planRenewsAt: string | null = null;
  if (organization && !isFoundingPartner) {
    try {
      const { getOrgBillingSnapshot, formatTrialRemaining } = await import(
        "@/lib/billing/org-billing"
      );
      const billing = await getOrgBillingSnapshot(organization.id);
      if (billing?.trialActive) {
        planLabel = "Professional (trial)";
        planRenewalLabel = formatTrialRemaining(billing.trialEndsAt);
        planPriceUsd = planById("professional").priceUsd;
        planRenewsAt = billing.trialEndsAt;
      } else if (billing?.trialExpired) {
        planLabel = "Starter (trial ended)";
        planRenewalLabel = "Choose a plan in Billing";
        planPriceUsd = planById("starter").priceUsd;
      } else if (billing?.subscriptionStatus === "active") {
        const tier =
          billing.planTier === "starter"
            ? "starter"
            : billing.planTier === "premium"
              ? "premium"
              : "professional";
        planLabel =
          tier === "starter"
            ? "Starter"
            : tier === "premium"
              ? "Premium ⭐"
              : "Professional";
        planPriceUsd = planById(tier).priceUsd;
        planRenewalLabel = "Active subscription";
      }
    } catch {
      // Billing columns may be missing before migration.
    }
  }

  return {
    organization,
    organizationId,
    schoolProfile,
    intelligence,
    teamCount,
    pendingInviteCount,
    inboxSourcesCount,
    playbooks,
    activeSchoolYear,
    hasCalendarSubscribeFeed,
    hasCalendarImport,
    integrations,
    activeIntegrations,
    isFoundingPartner,
    planLabel,
    planRenewalLabel,
    planPriceUsd,
    planRenewsAt,
    metaConnection,
    googleCalendarConnection,
    canvaConnection,
    mondayConnection,
  };
}

export async function getSettingsOverviewData(): Promise<SettingsOverviewData> {
  const bundle = await loadSettingsOverviewBundle();

  return {
    organizationName: bundle.organization?.name ?? null,
    organizationLocation: bundle.organization?.district ?? null,
    timezone: bundle.organization?.timezone ?? null,
    teamCount: bundle.teamCount,
    activeIntegrationsCount: bundle.activeIntegrations.length,
    totalIntegrationsCount: bundle.integrations.filter((item) => item.available)
      .length,
    planLabel: bundle.planLabel,
    planRenewalLabel: bundle.planRenewalLabel,
    isFoundingPartner: bundle.isFoundingPartner,
    integrations: bundle.integrations,
    aiVoiceSnippet: bundle.intelligence?.profile?.organizationVoice
      ? bundle.intelligence.profile.organizationVoice.slice(0, 160) +
        (bundle.intelligence.profile.organizationVoice.length > 160 ? "…" : "")
      : null,
    writingStyleLabel: writingStyleLabel(
      bundle.intelligence?.profile?.writingStyle ?? null,
    ),
    inboxSourcesCount: bundle.inboxSourcesCount,
    playbookCount: bundle.playbooks.length,
  };
}

export async function getSettingsEaseOverviewData(): Promise<SettingsEaseOverviewData> {
  const bundle = await loadSettingsOverviewBundle();
  const organization = bundle.organization;

  const locationParts = [
    organization?.weatherCity && organization?.weatherState
      ? `${organization.weatherCity}, ${organization.weatherState}`
      : organization?.weatherCity || organization?.district || null,
    organization?.timezone ?? null,
  ].filter(Boolean);

  const customerFacingIntegrations = bundle.activeIntegrations.filter(
    (item) => item.id === "meta" || item.id === "google-calendar",
  );
  const connectedDisplayNames = customerFacingIntegrations.map((item) =>
    item.id === "meta" ? "Meta" : "Google Calendar",
  );
  const connectedIntegrationsLabel =
    connectedDisplayNames.length > 0
      ? connectedDisplayNames.join(" · ")
      : "None connected yet";

  const schoolYearLabel =
    bundle.activeSchoolYear?.label ?? organization?.schoolYear ?? "Not set";
  const schoolDates = schoolYearDateLabels(schoolYearLabel);

  let planSubLabel = bundle.isFoundingPartner
    ? "Billing waived"
    : bundle.planRenewalLabel ?? "Checkout coming soon";
  if (!bundle.isFoundingPartner && bundle.planPriceUsd != null) {
    const priceBit = `$${bundle.planPriceUsd}/mo`;
    if (bundle.planRenewsAt) {
      const renews = new Date(bundle.planRenewsAt);
      if (!Number.isNaN(renews.getTime())) {
        const renewLabel = renews.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        planSubLabel = `Renews ${renewLabel} · ${priceBit}`;
      } else {
        planSubLabel = priceBit;
      }
    } else if (
      bundle.planRenewalLabel &&
      bundle.planRenewalLabel !== "Active subscription"
    ) {
      planSubLabel = `${bundle.planRenewalLabel} · ${priceBit}`;
    } else {
      planSubLabel = priceBit;
    }
  }

  const styleLabel = writingStyleLabel(
    bundle.intelligence?.profile?.writingStyle ?? null,
  );
  const brandAssets = bundle.schoolProfile?.brandAssets ?? null;
  const brandKitReady = Boolean(
    brandAssets?.primaryColor?.trim() ||
      brandAssets?.ptoLogo ||
      brandAssets?.schoolLogo,
  );
  const aiBrainConfigured = Boolean(
    bundle.intelligence?.profile?.organizationVoice?.trim() ||
      bundle.intelligence?.profile?.writingStyle?.trim(),
  );
  const aiBrainStatusLabel = aiBrainConfigured
    ? [styleLabel, "set"].filter(Boolean).join(" · ")
    : "Not set";

  return {
    organizationShortName: shortenOrganizationName(organization?.name ?? null),
    organizationLocationLine:
      locationParts.length > 0 ? locationParts.join(" · ") : "Location not set",
    teamCount: bundle.teamCount,
    pendingInviteCount: bundle.pendingInviteCount,
    activeIntegrationsCount: customerFacingIntegrations.length,
    connectedIntegrationsLabel,
    planLabel: bundle.planLabel,
    planSubLabel,
    metaConnected: isMetaConnectionConfigured(bundle.metaConnection),
    googleCalendarConnected:
      isGoogleCalendarConnectionConfigured(bundle.googleCalendarConnection) ||
      bundle.hasCalendarSubscribeFeed ||
      bundle.hasCalendarImport,
    canvaConnected: isCanvaConnectionConfigured(bundle.canvaConnection),
    schoolYearLabel,
    schoolYearStartsLabel: schoolDates.starts,
    schoolYearEndsLabel: schoolDates.ends,
    calendarFeedSaved: bundle.hasCalendarSubscribeFeed,
    writingStyleLabel: styleLabel,
    inboxSourcesCount: bundle.inboxSourcesCount,
    brandKitReady,
    aiBrainStatusLabel,
  };
}

export async function getSettingsEaseBrandingHubData(): Promise<SettingsEaseBrandingHubData> {
  const bundle = await loadSettingsOverviewBundle();
  const organization = bundle.organization;
  const brandAssets = bundle.schoolProfile?.brandAssets ?? null;
  const styleLabel = writingStyleLabel(
    bundle.intelligence?.profile?.writingStyle ?? null,
  );
  const aiBrainConfigured = Boolean(
    bundle.intelligence?.profile?.organizationVoice?.trim() ||
      bundle.intelligence?.profile?.writingStyle?.trim(),
  );
  const schoolYearLabel =
    bundle.activeSchoolYear?.label ?? organization?.schoolYear ?? "Not set";
  const brandKitReady = Boolean(
    brandAssets?.primaryColor?.trim() ||
      brandAssets?.ptoLogo ||
      brandAssets?.schoolLogo,
  );

  return {
    organizationShortName: shortenOrganizationName(organization?.name ?? null),
    writingStyleLabel: styleLabel,
    aiBrainConfigured,
    aiBrainStatusLabel: aiBrainConfigured
      ? [styleLabel, "set"].filter(Boolean).join(" · ")
      : "Not set",
    inboxSourcesCount: bundle.inboxSourcesCount,
    playbookCount: bundle.playbooks.length,
    schoolYearLabel,
    primaryColor: brandAssets?.primaryColor?.trim() || "#2F4A3C",
    accentColor: brandAssets?.secondaryColor?.trim() || "#C4922E",
    fontStyle: brandAssets?.fontFamily?.trim() || "Modern",
    mascotLabel: organization?.mascot?.trim() || "Not set",
    ptoLogoUploaded: Boolean(brandAssets?.ptoLogo),
    schoolLogoUploaded: Boolean(brandAssets?.schoolLogo),
    ptoLogoUrl:
      resolveAssetImageUrl(brandAssets?.ptoLogo ?? null) ??
      brandAssets?.ptoLogo ??
      null,
    schoolLogoUrl:
      resolveAssetImageUrl(brandAssets?.schoolLogo ?? null) ??
      brandAssets?.schoolLogo ??
      null,
    brandKitReady,
  };
}

export interface SettingsEaseIntegrationsData {
  organizationName: string | null;
  meta: {
    connected: boolean;
    /** Stored connection exists but Meta says the Page token is invalid/expired. */
    reconnectRequired: boolean;
    available: boolean;
  };
  googleCalendar: {
    connected: boolean;
    configured: boolean;
  };
  canva: {
    connected: boolean;
    configured: boolean;
  };
  monday: {
    connected: boolean;
    enabled: boolean;
    configured: boolean;
  };
}

export async function getIntegrationsSettingsData(): Promise<{
  integrations: IntegrationStatus[];
  ease: SettingsEaseIntegrationsData;
}> {
  const bundle = await loadSettingsOverviewBundle();
  const inboxConnection = await getInboxConnectionStatus();

  const integrations = bundle.integrations.filter((item) => item.available);
  const metaConnected = isMetaConnectionConfigured(bundle.metaConnection);

  return {
    integrations,
    ease: {
      organizationName: bundle.organization?.name ?? null,
      meta: {
        connected: metaConnected,
        reconnectRequired:
          metaConnected && inboxConnection.metaReconnectRequired,
        available: isMetaIntegrationConfigured(),
      },
      googleCalendar: {
        connected: isGoogleCalendarConnectionConfigured(
          bundle.googleCalendarConnection,
        ),
        configured: isGoogleCalendarIntegrationConfigured(),
      },
      canva: {
        connected: isCanvaConnectionConfigured(bundle.canvaConnection),
        configured: isCanvaIntegrationConfigured(),
      },
      monday: {
        connected: Boolean(bundle.mondayConnection?.accessToken),
        enabled: isMondayIntegrationEnabled(),
        configured: isMondayIntegrationConfigured(),
      },
    },
  };
}
