import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("settings ease UI contracts", () => {
  const layout = readSrc("../../../app/(dashboard)/settings/layout.tsx");
  const page = readSrc("../../../app/(dashboard)/settings/page.tsx");
  const shell = readSrc("../../../components/settings-v2/SettingsEaseShell.tsx");
  const overview = readSrc(
    "../../../components/settings-v2/SettingsEaseOverview.tsx",
  );
  const nav = readSrc(
    "../../../components/settings-v2/settings-ease-nav-config.ts",
  );
  const brandingPage = readSrc(
    "../../../app/(dashboard)/settings/branding/page.tsx",
  );
  const brandingEase = readSrc(
    "../../../components/settings-v2/SettingsEaseBranding.tsx",
  );
  const brandingSection = readSrc(
    "../../../lib/settings-v2/settings-ease-branding-section.ts",
  );
  const schoolYearPage = readSrc(
    "../../../app/(dashboard)/settings/school-year/page.tsx",
  );
  const schoolYearSection = readSrc(
    "../../../components/settings/SchoolYearSettingsSection.tsx",
  );
  const schoolYearEase = readSrc(
    "../../../components/settings-v2/SettingsEaseSchoolYear.tsx",
  );
  const sectionChrome = readSrc(
    "../../../components/settings-v2/SettingsEaseSectionChrome.tsx",
  );
  const aiBrainPage = readSrc(
    "../../../app/(dashboard)/settings/ai-brain/page.tsx",
  );
  const inboxAiContent = readSrc(
    "../../../components/settings-v2/InboxAiSettingsContent.tsx",
  );
  const playbooksContent = readSrc(
    "../../../components/settings-v2/PlaybooksMilestonesContent.tsx",
  );
  const accountPage = readSrc(
    "../../../app/(dashboard)/settings/account/page.tsx",
  );
  const accountEase = readSrc(
    "../../../components/settings-v2/SettingsEaseAccount.tsx",
  );
  const accountActions = readSrc("../../../lib/settings-v2/account-actions.ts");
  const organizationPage = readSrc(
    "../../../app/(dashboard)/settings/organization/page.tsx",
  );
  const organizationContent = readSrc(
    "../../../components/settings-v2/OrganizationSettingsContent.tsx",
  );
  const organizationEase = readSrc(
    "../../../components/settings-v2/SettingsEaseOrganization.tsx",
  );
  const teamAccessPage = readSrc(
    "../../../app/(dashboard)/settings/team-access/page.tsx",
  );
  const teamAccessContent = readSrc(
    "../../../components/settings-v2/TeamAccessSettingsContent.tsx",
  );
  const teamAccessEase = readSrc(
    "../../../components/settings-v2/SettingsEaseTeamAccess.tsx",
  );
  const integrationsPage = readSrc(
    "../../../app/(dashboard)/settings/integrations/page.tsx",
  );
  const integrationsContent = readSrc(
    "../../../components/settings-v2/IntegrationsSettingsContent.tsx",
  );
  const integrationsEase = readSrc(
    "../../../components/settings-v2/SettingsEaseIntegrations.tsx",
  );
  const metaPage = readSrc("../../../app/(dashboard)/settings/meta/page.tsx");
  const metaEase = readSrc(
    "../../../components/settings-v2/SettingsEaseMeta.tsx",
  );
  const metaUtils = readSrc(
    "../../../lib/meta-publishing/connection-utils.ts",
  );
  const calendarPage = readSrc(
    "../../../app/(dashboard)/settings/integrations/calendar/page.tsx",
  );
  const calendarEase = readSrc(
    "../../../components/settings-v2/SettingsEaseCalendar.tsx",
  );
  const billingPlanPage = readSrc(
    "../../../app/(dashboard)/settings/billing-plan/page.tsx",
  );
  const billingPlanContent = readSrc(
    "../../../components/settings-v2/BillingPlanContent.tsx",
  );
  const billingEase = readSrc(
    "../../../components/settings-v2/SettingsEaseBilling.tsx",
  );

  it("wires /settings layout + page to Ease shell and overview (not dense V2 chrome)", () => {
    assert.match(layout, /SettingsEaseShell/);
    assert.doesNotMatch(layout, /SettingsV2Shell/);
    assert.match(page, /SettingsEaseOverview/);
    assert.match(page, /getSettingsEaseOverviewData/);
    assert.doesNotMatch(page, /SettingsOverviewContent/);
  });

  it("keeps soft left nav sections exact to the mockup", () => {
    assert.match(nav, /Overview/);
    assert.match(nav, /Organization/);
    assert.match(nav, /Branding/);
    assert.match(nav, /Team & Access/);
    assert.match(nav, /Integrations/);
    assert.match(nav, /Billing & Plan/);
    assert.match(nav, /Account/);
    assert.match(nav, /href: "\/settings"/);
    assert.match(nav, /href: "\/settings\/organization"/);
    assert.match(nav, /href: "\/settings\/branding"/);
    assert.match(nav, /href: "\/settings\/team-access"/);
    assert.match(nav, /href: "\/settings\/integrations"/);
    assert.match(nav, /href: "\/settings\/billing-plan"/);
    assert.match(nav, /href: "\/settings\/account"/);
    assert.doesNotMatch(nav, /School year/);
    assert.doesNotMatch(nav, /href: "\/settings\/school-year"/);
    assert.doesNotMatch(nav, /AI Brain/);
    assert.doesNotMatch(nav, /href: "\/settings\/ai-brain"/);
    assert.doesNotMatch(nav, /Playbooks/);
    assert.match(nav, /pathname\.startsWith\("\/settings\/school-year"\)/);
    assert.match(nav, /pathname\.startsWith\("\/settings\/ai-brain"\)/);
  });

  it("groups hub nav into Workspace, Connections, and You", () => {
    assert.match(nav, /label: "Workspace"/);
    assert.match(nav, /label: "Connections"/);
    assert.match(nav, /label: "You"/);
    assert.match(nav, /SETTINGS_EASE_NAV_GROUPS/);
    const navItemCount = (nav.match(/id: "/g) ?? []).length;
    assert.equal(navItemCount, 7);
  });

  it("uses cream / Fraunces hub chrome on Overview (no dense summary icons)", () => {
    assert.match(shell, /settings-ease-nav/);
    assert.match(shell, /#fffcf7|#f6f2eb|#2f4a3c/);
    assert.match(overview, /Organization, team, connections, and billing/);
    assert.match(overview, /View profile →/);
    assert.match(overview, /Manage team →/);
    assert.match(overview, /Manage connections →/);
    assert.match(overview, /Manage billing →/);
    assert.match(overview, /Facebook & Instagram/);
    assert.match(overview, /Google Calendar/);
    assert.match(overview, /Active year ·/);
    assert.match(overview, /title="Branding"/);
    assert.match(overview, /actionHref="\/settings\/branding"/);
    assert.match(overview, /Inbox sources, communication plans, brand kit, school year/);
    assert.match(overview, /Tools ready for your active year/);
    assert.match(overview, /font-fraunces/);
    assert.doesNotMatch(overview, /SettingsV2Card/);
    assert.doesNotMatch(overview, /AI Brain/);
    assert.doesNotMatch(overview, /Quick Actions/);
    assert.doesNotMatch(overview, /Account Health/);
    assert.doesNotMatch(overview, /actionHref="\/settings\/school-year"/);
  });

  it("wires Branding hub to Ease panels (nav School year → Branding)", () => {
    assert.match(brandingPage, /SettingsEaseBranding/);
    assert.match(brandingPage, /getSettingsEaseBrandingHubData/);
    assert.match(brandingPage, /brandingEaseSectionFromParam/);
    assert.match(brandingPage, /SchoolYearSettingsSection/);
    assert.match(brandingPage, /embedded/);
    assert.doesNotMatch(brandingPage, /SettingsV2PageHeader/);
    assert.doesNotMatch(brandingPage, /SettingsV2Card/);

    assert.match(brandingSection, /SettingsEaseBrandingSection/);
    assert.match(brandingSection, /brandingEaseSectionFromParam/);
    assert.match(brandingSection, /"hub"/);
    assert.match(brandingSection, /value === "ai-brain"/);
    assert.match(brandingSection, /"ai-inbox"/);
    assert.match(brandingSection, /"playbook"/);
    assert.match(brandingSection, /"colors-logos"/);
    assert.match(brandingSection, /"school-year"/);

    assert.match(brandingEase, /data-settings-ease="branding"/);
    assert.match(
      brandingEase,
      /looks and plans the year — inbox sources/,
    );
    assert.match(brandingEase, /role="tablist"/);
    assert.match(brandingEase, /aria-label="Branding sections"/);
    assert.doesNotMatch(brandingEase, /AI Brain/);
    assert.doesNotMatch(brandingEase, /href="\/settings\/ai-brain"/);
    assert.match(brandingEase, /AI Inbox/);
    assert.match(brandingEase, /Communication Plan/);
    assert.match(brandingEase, /Branding Colors and Logos/);
    assert.match(brandingEase, /School Year/);
    assert.match(brandingEase, /href="\/settings\/inbox-ai"/);
    assert.match(brandingEase, /href="\/settings\/playbooks-milestones"/);
    assert.match(brandingEase, /onboarding\/brand\?standalone=1/);
    assert.match(brandingEase, /schoolYearPanel/);
    assert.match(brandingEase, /history\.replaceState/);
    assert.match(brandingEase, /searchParams\.set\("section"/);
    assert.match(brandingEase, /font-fraunces/);
    assert.match(brandingEase, /#fffcf7|#2f4a3c/);
    assert.doesNotMatch(brandingEase, /SettingsV2Card/);
    assert.doesNotMatch(brandingEase, /SettingsV2PageHeader/);

    assert.match(sectionChrome, /SettingsEaseSectionChrome/);
    assert.match(sectionChrome, /← Branding/);
    assert.match(inboxAiContent, /SettingsEaseSectionChrome/);
    assert.match(inboxAiContent, /data-settings-ease="ai-inbox"/);
    assert.match(playbooksContent, /SettingsEaseSectionChrome/);
    assert.match(playbooksContent, /data-settings-ease="playbook"/);

    assert.match(aiBrainPage, /redirect\("\/settings\/branding"\)/);
    assert.doesNotMatch(aiBrainPage, /AiBrainSettingsContent/);
    assert.doesNotMatch(aiBrainPage, /TrainingLibrarySection/);
  });

  it("wires Account to Ease panels (Phase 7 — no dense V2 chrome blend)", () => {
    assert.match(accountPage, /SettingsEaseAccount/);
    assert.match(accountPage, /getSettingsEaseAccountData/);
    assert.doesNotMatch(accountPage, /SettingsV2PageHeader/);
    assert.doesNotMatch(accountPage, /SettingsV2Card/);

    assert.match(accountEase, /data-settings-ease="account"/);
    assert.match(
      accountEase,
      /Your profile for this workspace, password, quiet notifications, and/,
    );
    assert.match(accountEase, /Your profile/);
    assert.match(accountEase, /How you appear to teammates/);
    assert.match(accountEase, /Display name/);
    assert.match(accountEase, /Change password/);
    assert.match(accountEase, /changePasswordAction/);
    assert.match(accountEase, /data-settings-ease="account-change-password"/);
    assert.match(accountEase, /canChangePassword/);
    assert.match(accountEase, /You sign in with/);
    assert.match(accountEase, /Google/);
    assert.match(accountEase, /Update password/);
    assert.match(accountEase, /Notifications/);
    assert.match(
      accountEase,
      /Optional — keep these quiet if you only want in-app cues/,
    );
    assert.match(accountEase, /Approval needs attention/);
    assert.match(accountEase, /Inbox follow-ups/);
    assert.match(accountEase, /Weekly summary email/);
    assert.match(accountEase, /Session/);
    assert.match(accountEase, /How long you stay signed in on this device/);
    assert.match(accountEase, /30 days/);
    assert.match(
      accountEase,
      /no automatic logout after a short period of inactivity/,
    );
    assert.match(accountEase, /SignOutForm/);
    assert.match(accountEase, /Sign out/);
    assert.match(accountEase, /Delete \/ erase account/);
    assert.match(accountEase, /eraseAccountAction/);
    assert.match(accountEase, /data-settings-ease="account-erase"/);
    assert.match(accountEase, /Erase my account/);
    assert.match(accountEase, /saveAccountNotificationPreferencesAction/);
    assert.match(accountEase, /updateAccountProfileAction/);
    assert.match(accountEase, /font-fraunces/);
    assert.match(accountEase, /#fffcf7|#2f4a3c/);
    assert.doesNotMatch(accountEase, /SettingsV2Card/);
    assert.doesNotMatch(accountEase, /SettingsV2PageHeader/);

    assert.match(accountActions, /notification_preferences/);
    assert.match(accountActions, /display_name/);
    assert.match(accountActions, /eraseAccountAction/);
    assert.match(accountActions, /auth\.admin\.deleteUser/);
  });

  it("wires School year to Ease panels (Phase 3 — nested under Branding)", () => {
    assert.match(schoolYearPage, /SchoolYearSettingsSection/);
    assert.doesNotMatch(schoolYearPage, /SettingsV2PageHeader/);
    assert.match(schoolYearSection, /SettingsEaseSchoolYear/);
    assert.match(schoolYearSection, /embedded/);
    assert.doesNotMatch(schoolYearSection, /SchoolYearSettingsPanel/);

    assert.match(schoolYearEase, /data-settings-ease="school-year"/);
    assert.match(schoolYearEase, /embedded/);
    assert.match(schoolYearEase, /Active year scopes calendar, events, and import review/);
    assert.match(schoolYearEase, /What the workspace is planning against right now/);
    assert.match(schoolYearEase, /Archive this year when you’re ready for the next one/);
    assert.match(schoolYearEase, /Close year & begin next/);
    assert.match(schoolYearEase, /Refresh calendar feed/);
    assert.match(schoolYearEase, /Calendar subscribe URL/);
    assert.match(schoolYearEase, /Next year label/);
    assert.match(schoolYearEase, /Start date/);
    assert.match(schoolYearEase, /End date/);
    assert.match(schoolYearEase, /font-fraunces/);
    assert.match(schoolYearEase, /#fffcf7|#2f4a3c/);
    assert.match(schoolYearEase, /saveCalendarSubscribeUrlAction/);
    assert.match(schoolYearEase, /syncCalendarSubscribeFeedAction/);
    assert.match(schoolYearEase, /closeSchoolYearAndBeginNextAction/);
    assert.doesNotMatch(schoolYearEase, /SettingsV2Card/);
    assert.doesNotMatch(schoolYearEase, /SettingsV2PageHeader/);
    assert.doesNotMatch(schoolYearEase, /cos-card/);
    assert.doesNotMatch(schoolYearEase, /Clear calendar/);
  });

  it("wires Organization to Ease panels (Phase 2 — no dense V2 chrome blend)", () => {
    assert.match(organizationPage, /OrganizationSettingsContent/);
    assert.match(organizationContent, /SettingsEaseOrganization/);
    assert.match(organizationContent, /getPostingPreferencesSettingsData/);
    assert.doesNotMatch(organizationContent, /SettingsV2Card/);
    assert.doesNotMatch(organizationContent, /PostingPreferencesPanel/);
    assert.doesNotMatch(organizationContent, /Board roster/);

    assert.match(organizationEase, /data-settings-ease="organization"/);
    assert.match(
      organizationEase,
      /Organization profile and workspace preferences\. Logos and year[\s\S]*live under Branding/,
    );
    assert.match(organizationEase, /Shown across Hey Ralli for this workspace/);
    assert.match(organizationEase, /Street address/);
    assert.match(organizationEase, /name="addressLine1"/);
    assert.match(organizationEase, /name="city"/);
    assert.match(organizationEase, /name="state"/);
    assert.match(organizationEase, /name="postalCode"/);
    assert.match(organizationEase, /name="country"/);
    assert.match(organizationEase, /Weather location/);
    assert.match(organizationEase, /name="weatherZip"/);
    assert.match(organizationEase, /Branding home/);
    assert.match(
      organizationEase,
      /Colors, logos, inbox sources, communication plans, and school year moved here/,
    );
    assert.match(organizationEase, /Language and school details/);
    assert.match(organizationEase, /Default windows for Meta publishing/);
    assert.match(organizationEase, /Open Branding/);
    assert.match(organizationEase, /Save changes/);
    assert.match(organizationEase, /Edit schedule/);
    assert.match(organizationEase, /Preferred days/);
    assert.match(organizationEase, /Preferred time/);
    assert.match(organizationEase, /font-fraunces/);
    assert.match(organizationEase, /#fffcf7|#2f4a3c/);
    assert.match(organizationEase, /href="\/settings\/branding"/);
    assert.doesNotMatch(organizationEase, /AI Brain/);
    assert.match(organizationEase, /updateOrganizationProfileAction/);
    assert.match(organizationEase, /savePostingPreferencesAction/);
    assert.doesNotMatch(organizationEase, /SettingsV2Card/);
    assert.doesNotMatch(organizationEase, /SettingsV2PageHeader/);
    assert.doesNotMatch(organizationEase, /cos-card/);
    assert.doesNotMatch(organizationEase, /Colors and logos for generated content/);
  });

  it("wires Team & Access to Ease panels (Phase 4 — no dense V2 chrome blend)", () => {
    assert.match(teamAccessPage, /TeamAccessSettingsContent/);
    assert.match(teamAccessPage, /getOrganizationMemberLastSignIns/);
    assert.match(teamAccessPage, /getOrgBillingSnapshot|getSettingsBillingContext/);
    assert.doesNotMatch(teamAccessPage, /SettingsV2PageHeader/);
    assert.match(teamAccessContent, /SettingsEaseTeamAccess/);
    assert.match(teamAccessContent, /lastSignInAtByUserId/);
    assert.match(teamAccessContent, /canEditAccessTemplates/);
    assert.doesNotMatch(teamAccessContent, /TeamAccessShell/);
    assert.doesNotMatch(teamAccessContent, /SettingsV2PageHeader/);

    assert.match(teamAccessEase, /data-settings-ease="team-access"/);
    assert.match(teamAccessEase, /Team & Access/);
    assert.match(
      teamAccessEase,
      /Manage the people helping our school/,
    );
    assert.match(teamAccessEase, /TeamAccessPilotMemberDrawer/);
    assert.match(teamAccessEase, /TeamAccessEditMemberModal/);
    assert.match(teamAccessEase, /TeamAccessPilotAddMemberModal/);
    assert.doesNotMatch(teamAccessEase, /SettingsV2PageHeader/);
    assert.doesNotMatch(teamAccessEase, /SettingsV2Card/);
    assert.doesNotMatch(teamAccessEase, /TeamAccessShell/);
    assert.match(teamAccessEase, /removeTeamMemberAction/);
  });

  it("ships Team & Access person drawer Ease contract (permissions + events + deep links)", () => {
    const personDrawer = readSrc(
      "../../../components/settings-v2/SettingsEaseTeamAccessPersonDrawer.tsx",
    );
    assert.match(personDrawer, /data-settings-ease="person-drawer"/);
    assert.match(personDrawer, /bg-\[#f6f2eb\]/);
    assert.match(personDrawer, /font-fraunces/);
    assert.match(personDrawer, /Overview/);
    assert.match(personDrawer, /Events/);
    assert.match(personDrawer, /Access/);
    assert.match(personDrawer, /Access role/);
    assert.match(personDrawer, /Save changes/);
    assert.match(personDrawer, /Give access|Resend invite/);
    assert.match(personDrawer, /inviteFeedback|data-settings-ease="invite-feedback"/);
    assert.match(personDrawer, /Sending…/);
    assert.match(teamAccessEase, /Invite email sent/);
    assert.match(personDrawer, /onSaveEventAssignments/);
    assert.match(personDrawer, /onSaveAccessLevel/);
    assert.match(personDrawer, /ACCESS_PERMISSION_KEYS/);
    assert.match(personDrawer, /role="switch"/);
    assert.match(personDrawer, /formatLastLoggedInLabel/);
    assert.match(personDrawer, /Last logged in/);
    assert.match(personDrawer, /onRemove/);
    assert.match(personDrawer, /Trash2/);
    assert.match(
      personDrawer,
      /aria-label=\{`Delete \$\{member\.displayName\}`\}/,
    );
    assert.doesNotMatch(personDrawer, /TeamAccessDrawer/);
    assert.doesNotMatch(personDrawer, /SettingsV2Card/);
    assert.doesNotMatch(personDrawer, /bg-cos-card/);
  });

  it("wires Integrations hub + Meta + Calendar to Ease panels (Phase 5 — no dense V2 chrome blend)", () => {
    assert.match(integrationsPage, /IntegrationsSettingsContent/);
    assert.match(integrationsPage, /getIntegrationsSettingsData/);
    assert.doesNotMatch(integrationsPage, /SettingsV2PageHeader/);
    assert.match(integrationsContent, /SettingsEaseIntegrations/);
    assert.doesNotMatch(integrationsContent, /SettingsV2Card/);
    assert.doesNotMatch(integrationsContent, /SettingsV2PageHeader/);

    assert.match(integrationsEase, /data-settings-ease="integrations"/);
    assert.match(
      integrationsEase,
      /Connect once per tool — approve what Facebook or Google shows/,
    );
    assert.match(integrationsEase, /Meta review–friendly labels/);
    assert.match(integrationsEase, /Facebook & Instagram/);
    assert.match(integrationsEase, /Google Calendar/);
    assert.match(integrationsEase, /Connect Canva/);
    assert.match(integrationsEase, /Reconnect needed/);
    assert.match(integrationsEase, /data\.meta\.reconnectRequired/);
    assert.doesNotMatch(integrationsEase, /Monday\.com/);
    assert.doesNotMatch(integrationsEase, /Gmail · Dropbox/);
    assert.doesNotMatch(integrationsEase, /SignUpGenius/);
    assert.doesNotMatch(integrationsEase, /Not available in soft launch yet/);
    assert.doesNotMatch(integrationsEase, /Coming soon/);
    assert.match(integrationsEase, /font-fraunces/);
    assert.match(integrationsEase, /#fffcf7|#2f4a3c/);
    assert.match(integrationsEase, /buildOAuthStartPath/);
    assert.doesNotMatch(integrationsEase, /SettingsV2Card/);
    assert.doesNotMatch(integrationsEase, /SettingsV2PageHeader/);
    assert.doesNotMatch(integrationsEase, /from "@\/components\/settings-v2\/IntegrationLogo"/);
    assert.doesNotMatch(integrationsEase, /Constant Contact/);

    assert.match(metaPage, /SettingsEaseMeta/);
    assert.doesNotMatch(metaPage, /StudioPageHeader/);
    assert.doesNotMatch(metaPage, /MetaConnectionPanel/);
    assert.match(metaPage, /toMetaSettingsConnectionView/);
    assert.doesNotMatch(
      metaPage,
      /connection=\{connection\}/,
    );
    assert.match(metaPage, /connection=\{connectionView\}/);
    assert.match(metaPage, /pagePictureUrl=\{inboxConnection\.pagePictureUrl\}/);
    assert.match(metaPage, /instagramUsername=\{instagramUsername\}/);
    assert.match(metaPage, /instagramPictureUrl=\{instagramPictureUrl\}/);
    assert.match(metaPage, /fetchInstagramProfessionalProfile/);
    assert.match(metaPage, /messagingReady=\{inboxConnection\.messagingReady\}/);
    assert.doesNotMatch(metaPage, /configuredViaEnv=\{/);
    assert.doesNotMatch(metaEase, /pageAccessToken/);
    assert.doesNotMatch(metaEase, /\bMetaConnection\b/);
    assert.match(metaEase, /MetaSettingsConnectionView/);
    assert.match(metaEase, /data-settings-ease="meta"/);
    assert.match(metaEase, /getMetaConnectUiPhase/);
    assert.match(metaEase, /Connect Facebook & Instagram/);
    assert.match(metaEase, /Before you start/);
    assert.match(metaEase, /Instagram isn’t connected yet/);
    assert.match(metaEase, /You’re connected/);
    assert.match(metaEase, /How to connect Instagram/);
    assert.match(metaEase, /Connection status/);
    assert.match(metaEase, /messagingReady/);
    assert.match(metaEase, /getMetaCapabilityStatusLabels/);
    assert.match(metaEase, /InstagramAvatar/);
    assert.match(metaEase, /instagramUsername/);
    assert.doesNotMatch(metaEase, /Linked to this Page/);
    assert.match(metaUtils, /Needs setup/);
    assert.doesNotMatch(metaEase, /Publishing, inbox, and Insights are ready/);
    assert.match(metaEase, /disconnectMetaConnectionAction/);
    assert.match(metaEase, /buildMetaOAuthStartPath/);
    assert.match(metaEase, /Reconnect/);
    assert.match(metaEase, /Disconnect/);
    assert.match(metaEase, /font-fraunces/);
    assert.match(metaEase, /#fffcf7|#2f4a3c/);
    assert.doesNotMatch(metaEase, /SettingsV2Card/);
    assert.doesNotMatch(metaEase, /StudioPageHeader/);
    assert.doesNotMatch(metaEase, /pageAccessToken/);
    assert.doesNotMatch(metaEase, /Oak Ridge/);
    assert.doesNotMatch(metaEase, /cdn\.tailwindcss/);
    assert.doesNotMatch(metaEase, /fonts\.googleapis/);
    assert.doesNotMatch(metaEase, /phosphor-icons/);

    assert.match(calendarPage, /SettingsEaseCalendar/);
    assert.doesNotMatch(calendarPage, /StudioPageHeader/);
    assert.doesNotMatch(calendarPage, /GoogleCalendarConnectionPanel/);
    assert.match(calendarEase, /data-settings-ease="calendar"/);
    assert.match(calendarEase, /Sign in to bring events in/);
    assert.match(calendarEase, /Signed in with Google/);
    assert.match(calendarEase, /daily refresh keeps your year calendar up to date/);
    assert.match(calendarEase, /Refresh calendar/);
    assert.match(calendarEase, /Open Import/);
    assert.match(calendarEase, /Subscribe feed/);
    assert.match(calendarEase, /Calendar subscribe URL/);
    assert.match(calendarEase, /Save feed/);
    assert.match(calendarEase, /syncGoogleCalendarAction/);
    assert.match(calendarEase, /disconnectGoogleCalendarAction/);
    assert.match(calendarEase, /saveCalendarSubscribeUrlAction/);
    assert.match(calendarEase, /font-fraunces/);
    assert.match(calendarEase, /#fffcf7|#2f4a3c/);
    assert.doesNotMatch(calendarEase, /SettingsV2Card/);
    assert.doesNotMatch(calendarEase, /StudioPageHeader/);
    assert.doesNotMatch(calendarEase, /GoogleCalendarConnectionPanel/);
  });

  it("wires Billing & Plan to Ease panels (usage / plans / payment — mockup exact)", () => {
    assert.match(billingPlanPage, /BillingPlanContent/);
    assert.match(billingPlanPage, /getSettingsBillingContext/);
    assert.match(billingPlanPage, /getOrgStripeBillingDisplay/);
    assert.match(billingPlanPage, /getOrgAiUsageBreakdown/);
    assert.match(billingPlanPage, /billingEaseViewFromParam/);
    assert.match(
      billingPlanPage,
      /@\/lib\/billing\/settings-ease-billing-view/,
    );
    assert.doesNotMatch(
      billingPlanPage,
      /from "@\/components\/settings-v2\/SettingsEaseBilling"/,
    );
    assert.doesNotMatch(billingPlanPage, /SettingsV2PageHeader/);
    assert.match(billingPlanContent, /SettingsEaseBilling/);
    assert.doesNotMatch(billingPlanContent, /<BillingPlanTabs/);
    assert.doesNotMatch(billingPlanContent, /SettingsV2Card/);
    assert.doesNotMatch(billingPlanContent, /SettingsV2PageHeader/);

    assert.match(billingEase, /data-settings-ease="billing"/);
    assert.match(
      billingEase,
      /Usage this period, what happens when you run low/,
    );
    assert.match(billingEase, /history\.replaceState/);
    assert.match(billingEase, /searchParams\.set\("view"/);
    assert.match(billingEase, /settings-ease-billing-view/);
    assert.match(billingEase, /Open Stripe portal/);
    assert.match(billingEase, /Current plan/);
    assert.match(billingEase, /Change plan/);
    assert.match(billingEase, /View invoices/);
    assert.match(billingEase, /Buy more Reserve/);
    assert.match(billingEase, /Period snapshot/);
    assert.match(billingEase, /AI credits/);
    assert.match(billingEase, /Active seats/);
    assert.match(billingEase, /Meta posts this month/);
    assert.match(billingEase, /AI Reserve/);
    assert.match(billingEase, /No soft overage billing/);
    assert.match(billingEase, /Soft warn/);
    assert.match(billingEase, /Hard stop/);
    assert.match(billingEase, /Usage by category/);
    assert.match(billingEase, /Capacity limits/);
    assert.match(billingEase, /Compare plans/);
    assert.match(billingEase, /Upgrade to Premium/);
    assert.match(billingEase, /PAID_PLANS\.map/);
    assert.match(billingEase, /Payment method/);
    assert.match(billingEase, /Managed securely in Stripe/);
    assert.match(billingEase, /Billing email/);
    assert.match(billingEase, /Next renewal/);
    assert.match(billingEase, /Manage subscription/);
    assert.match(billingEase, /createBillingPortalSession/);
    assert.match(billingEase, /createPlanCheckoutSession/);
    assert.match(billingEase, /createReserveCheckoutSession/);
    assert.match(billingEase, /RESERVE_CATALOG/);
    assert.match(billingEase, /font-fraunces/);
    assert.match(billingEase, /#fffcf7|#2f4a3c/);
    // Founding/exempt is entitlements-only — never strip plan catalog or CTAs.
    assert.doesNotMatch(billingEase, /Plan changes not required/);
    assert.doesNotMatch(billingEase, />Included</);
    assert.doesNotMatch(billingEase, /No subscription to manage/);
    assert.doesNotMatch(billingEase, /SettingsV2Card/);
    assert.doesNotMatch(billingEase, /SettingsV2PageHeader/);
    assert.doesNotMatch(billingEase, /BillingPlanTabs/);
    assert.doesNotMatch(billingEase, /Crown/);
    assert.doesNotMatch(billingEase, /surprise overage charge/i);
  });
});

