"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrganizationRosterImportPanel } from "@/components/organization-workspace/OrganizationRosterImportPanel";
import {
  SettingsEaseTeamAccessPersonDrawer,
  type EasePersonDrawerTab,
} from "@/components/settings-v2/SettingsEaseTeamAccessPersonDrawer";
import { TeamAccessAccessTemplatesPanel } from "@/components/settings-v2/team-access/TeamAccessAccessTemplatesPanel";
import { TeamAccessEditMemberModal } from "@/components/settings-v2/team-access/TeamAccessEditMemberModal";
import { TeamAccessGiveAppAccessModal } from "@/components/settings-v2/team-access/TeamAccessGiveAppAccessModal";
import { TeamAccessInviteModal } from "@/components/settings-v2/team-access/TeamAccessInviteModal";
import {
  accessLevelLabel,
  activeSeatsEaseSubLabel,
  buildUnifiedTeamMembers,
  canResendTeamInvite,
  isCurrentUserTeamMember,
  pendingInvitesEaseSubLabel,
  peopleEaseRoleLine,
  peopleLoginStatus,
  peopleRelatedEventIds,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  claimOrganizationAccessAction,
  replaceMemberEventAssignmentsAction,
  resendTeamInviteAction,
  setOrganizationUserEventAssignmentsAction,
  updateTeamMemberAction,
} from "@/lib/auth/actions";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { accessTemplateLabelMap } from "@/lib/access-templates/merge";
import {
  ACCESS_PERMISSION_LABELS,
  type AccessPermissionKey,
  type AccessTemplate,
} from "@/lib/access-templates/types";
import type { TeamAccessWorkloadIndex } from "@/lib/organization-workspace/team-access-workload";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationWorkspaceData } from "@/types/organization-workspace";

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnGhostClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent bg-transparent px-3 py-2 text-[13px] font-bold text-[#5c554c] transition-colors duration-100 hover:text-[#2a2622] disabled:cursor-not-allowed disabled:opacity-60";

const btnSmClassName = "px-3.5 py-2 text-xs";

const AVATAR_TONES = [
  "bg-[#2f4a3c] text-[#f6f2eb]",
  "bg-[#c4922e] text-[#2a2622]",
  "bg-[#2a7a86] text-[#fffcf7]",
  "bg-[#6b8171] text-[#fffcf7]",
] as const;

/** Soft summary chips — matches mockup’s six capability rows. */
const SUMMARY_PERMISSION_KEYS: AccessPermissionKey[] = [
  "view_all_events",
  "draft_edit",
  "approve_comms",
  "publish_social",
  "manage_people",
  "manage_billing",
];

interface SettingsEaseTeamAccessProps {
  members: OrganizationUser[];
  workspace: OrganizationWorkspaceData;
  workload: TeamAccessWorkloadIndex;
  canManage: boolean;
  canEditAccessTemplates?: boolean;
  accessTemplates: AccessTemplate[];
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  canProvisionAccounts: boolean;
  events: Array<{
    id: string;
    title: string;
    date?: string | null;
    status?: string | null;
  }>;
  seatLimit: number | null;
  planLabel: string;
}

function SoftCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  description,
}: {
  eyebrow: string;
  value: string;
  description: string;
}) {
  return (
    <SoftCard>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7a7166]">
        {eyebrow}
      </div>
      <div
        className="mt-1.5 text-[32px] font-semibold leading-none tracking-[-0.02em] text-[#2a2622]"
        style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
      >
        {value}
      </div>
      <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
        {description}
      </p>
    </SoftCard>
  );
}

function parseDrawerTab(value: string | null): EasePersonDrawerTab {
  if (value === "events" || value === "access" || value === "overview") {
    return value;
  }
  if (value === "responsibilities") return "events";
  return "overview";
}

/** Deep-link keys: member id, email local-part, or unique first name. */
function personDeepLinkKeys(member: UnifiedTeamMember): string[] {
  const keys = new Set<string>();
  keys.add(member.id);
  const emailLocal = member.email?.split("@")[0]?.trim().toLowerCase();
  if (emailLocal) keys.add(emailLocal);
  const first = member.displayName.trim().split(/\s+/)[0]?.toLowerCase();
  if (first) keys.add(first);
  return Array.from(keys);
}

function findMemberByPersonParam(
  people: UnifiedTeamMember[],
  person: string | null,
): UnifiedTeamMember | null {
  if (!person) return null;
  const needle = person.trim().toLowerCase();
  if (!needle) return null;

  const byId = people.find((member) => member.id === person);
  if (byId) return byId;

  const matches = people.filter((member) =>
    personDeepLinkKeys(member).some((key) => key === needle),
  );
  return matches.length === 1 ? matches[0]! : matches[0] ?? null;
}

function personQueryValue(
  member: UnifiedTeamMember,
  people: UnifiedTeamMember[],
): string {
  const first = member.displayName.trim().split(/\s+/)[0]?.toLowerCase();
  if (first) {
    const firstMatches = people.filter((entry) => {
      const entryFirst = entry.displayName.trim().split(/\s+/)[0]?.toLowerCase();
      return entryFirst === first;
    });
    if (firstMatches.length === 1) return first;
  }
  const emailLocal = member.email?.split("@")[0]?.trim().toLowerCase();
  if (emailLocal) return emailLocal;
  return member.id;
}

function syncPersonQuery(
  person: string | null,
  tab: EasePersonDrawerTab,
) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (person) {
    url.searchParams.set("person", person);
    if (tab === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
  } else {
    url.searchParams.delete("person");
    url.searchParams.delete("tab");
  }
  window.history.replaceState(window.history.state, "", url.toString());
}

export function SettingsEaseTeamAccess({
  members,
  workspace,
  workload,
  canManage,
  canEditAccessTemplates = false,
  accessTemplates,
  showClaimBanner,
  currentUserEmail,
  canProvisionAccounts,
  events,
  seatLimit,
  planLabel,
}: SettingsEaseTeamAccessProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<UnifiedTeamMember | null>(null);
  const [giveAppAccessOpen, setGiveAppAccessOpen] = useState(false);
  const [giveAppAccessMember, setGiveAppAccessMember] =
    useState<UnifiedTeamMember | null>(null);
  const [rolesEditorOpen, setRolesEditorOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<EasePersonDrawerTab>("overview");
  const [localMembers, setLocalMembers] = useState<UnifiedTeamMember[] | null>(
    null,
  );

  const accessLabels = useMemo(
    () => accessTemplateLabelMap(accessTemplates),
    [accessTemplates],
  );

  const unifiedMembers = useMemo(() => {
    const built = buildUnifiedTeamMembers(members, workspace, workload);
    return built.map((member) => ({
      ...member,
      accessLabel: accessLevelLabel(
        member.accessTemplateId ?? member.accessLevel,
        member.isRosterOnly,
        accessLabels,
      ),
    }));
  }, [members, workspace, workload, accessLabels]);

  const loginPeople = useMemo(() => {
    const source = localMembers ?? unifiedMembers;
    const people = source.filter((member) => {
      const status = peopleLoginStatus(member);
      return (
        status === "active" || status === "invited" || status === "inactive"
      );
    });

    return [...people].sort((left, right) => {
      const leftSelf = isCurrentUserTeamMember(left, currentUserEmail) ? 0 : 1;
      const rightSelf = isCurrentUserTeamMember(right, currentUserEmail)
        ? 0
        : 1;
      if (leftSelf !== rightSelf) return leftSelf - rightSelf;

      const statusRank = (member: UnifiedTeamMember) => {
        const status = peopleLoginStatus(member);
        if (status === "active") return 0;
        if (status === "invited") return 1;
        return 2;
      };
      const byStatus = statusRank(left) - statusRank(right);
      if (byStatus !== 0) return byStatus;
      return left.displayName.localeCompare(right.displayName);
    });
  }, [localMembers, unifiedMembers, currentUserEmail]);

  useEffect(() => {
    setLocalMembers(null);
  }, [unifiedMembers]);

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of loginPeople) {
      const key = member.accessTemplateId ?? member.accessLevel;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [loginPeople]);

  const rolePills = useMemo(() => {
    const used = accessTemplates.filter(
      (template) => (roleCounts.get(template.id) ?? 0) > 0,
    );
    const base =
      used.length > 0
        ? used
        : accessTemplates.filter(
            (template) =>
              template.id !== "developer" && template.id !== "tester",
          );
    return base.length > 0 ? base : accessTemplates;
  }, [accessTemplates, roleCounts]);

  const activeRoleId = selectedRoleId ?? rolePills[0]?.id ?? null;
  const activeRole =
    accessTemplates.find((template) => template.id === activeRoleId) ??
    rolePills[0] ??
    null;

  const activeCount = loginPeople.filter(
    (member) => peopleLoginStatus(member) === "active",
  ).length;
  const pendingCount = loginPeople.filter(
    (member) => peopleLoginStatus(member) === "invited",
  ).length;

  const drawerMember = useMemo(
    () =>
      drawerMemberId
        ? (loginPeople.find((member) => member.id === drawerMemberId) ??
          unifiedMembers.find((member) => member.id === drawerMemberId) ??
          null)
        : null,
    [drawerMemberId, loginPeople, unifiedMembers],
  );

  const drawerAvatarIndex = Math.max(
    0,
    loginPeople.findIndex((member) => member.id === drawerMemberId),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const person = params.get("person");
    const tab = parseDrawerTab(params.get("tab"));
    const match = findMemberByPersonParam(loginPeople, person);
    if (match) {
      setDrawerMemberId(match.id);
      setDrawerTab(tab);
    }
  }, [loginPeople]);

  function openPerson(member: UnifiedTeamMember, tab: EasePersonDrawerTab = "overview") {
    setDrawerMemberId(member.id);
    setDrawerTab(tab);
    syncPersonQuery(personQueryValue(member, loginPeople), tab);
  }

  function closePerson() {
    setDrawerMemberId(null);
    setDrawerTab("overview");
    syncPersonQuery(null, "overview");
  }

  function handleDrawerTabChange(tab: EasePersonDrawerTab) {
    setDrawerTab(tab);
    if (drawerMember) {
      syncPersonQuery(personQueryValue(drawerMember, loginPeople), tab);
    }
  }

  function openInvite() {
    setInviteOpen(true);
  }

  function openEdit(member: UnifiedTeamMember) {
    setEditMember(member);
    setEditOpen(true);
  }

  function openGiveAccess(member: UnifiedTeamMember) {
    if (!member.organizationMemberId && !member.raw) {
      setInviteOpen(true);
      return;
    }
    setGiveAppAccessMember(member);
    setGiveAppAccessOpen(true);
  }

  function handleClaim() {
    startTransition(async () => {
      await claimOrganizationAccessAction();
      router.refresh();
    });
  }

  function handleResendInvite(member: UnifiedTeamMember) {
    if (!canResendTeamInvite(member, canManage) || !member.raw) return;
    startTransition(async () => {
      await resendTeamInviteAction(member.raw!.id);
      router.refresh();
    });
  }

  async function handleSaveAccessLevel(
    member: UnifiedTeamMember,
    campaignRole: CampaignRole | string,
  ): Promise<string | null> {
    if (member.isRosterOnly || !member.raw) {
      return "Use Give access to grant login for people who are not invited yet.";
    }
    const result = await updateTeamMemberAction(member.raw.id, {
      campaignRole,
    });
    if (result.error) return result.error;

    const template =
      accessTemplates.find((entry) => entry.id === campaignRole) ?? null;
    const nextAccessLevel =
      template?.baseRole ?? (campaignRole as CampaignRole);
    const nextTemplateId = template?.id ?? String(campaignRole);

    setLocalMembers((current) => {
      const base = current ?? unifiedMembers;
      return base.map((entry) =>
        entry.id === member.id
          ? {
              ...entry,
              accessLevel: nextAccessLevel,
              accessTemplateId: nextTemplateId,
              accessLabel: accessLevelLabel(
                nextTemplateId,
                false,
                accessLabels,
              ),
              raw: entry.raw
                ? {
                    ...entry.raw,
                    campaignRole: nextAccessLevel,
                    accessTemplateId: nextTemplateId,
                  }
                : entry.raw,
            }
          : entry,
      );
    });
    router.refresh();
    return null;
  }

  async function handleSaveEventAssignments(
    member: UnifiedTeamMember,
    eventIds: string[],
  ): Promise<string | null> {
    if (member.organizationMemberId) {
      const result = await replaceMemberEventAssignmentsAction({
        organizationMemberId: member.organizationMemberId,
        eventIds,
      });
      if (result.error) return result.error;
    } else if (member.raw) {
      const result = await setOrganizationUserEventAssignmentsAction({
        organizationUserId: member.raw.id,
        eventIds,
      });
      if (result.error) return result.error;
    } else {
      return "Unable to link events for this person yet.";
    }

    setLocalMembers((current) => {
      const base = current ?? unifiedMembers;
      return base.map((entry) =>
        entry.id === member.id
          ? {
              ...entry,
              assignedEventIds: eventIds,
              raw: entry.raw
                ? { ...entry.raw, assignedEventIds: eventIds }
                : entry.raw,
            }
          : entry,
      );
    });
    router.refresh();
    return null;
  }

  return (
    <section
      className="settings-ease-team-access"
      data-settings-ease="team-access"
    >
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Team & Access
          </h1>
          <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
            People, roles, and what each person can do — link events and adjust
            access in one quiet pop-out.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <>
              <button
                type="button"
                className={btnSecondaryClassName}
                onClick={() => setImportOpen((open) => !open)}
                aria-expanded={importOpen}
              >
                Import roster
              </button>
              <button
                type="button"
                className={btnPrimaryClassName}
                onClick={openInvite}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Invite
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showClaimBanner ? (
        <SoftCard className="mb-3.5 border-[rgba(196,146,46,0.28)] bg-[rgba(196,146,46,0.1)]">
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Link your account
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            This PTO workspace exists but has no signed-in users yet. Claim
            admin access as{" "}
            <span className="font-semibold text-[#2a2622]">
              {currentUserEmail}
            </span>{" "}
            to manage the team.
          </p>
          <div className="mt-3.5">
            <button
              type="button"
              className={btnPrimaryClassName}
              disabled={isPending}
              onClick={handleClaim}
            >
              Claim admin access
            </button>
          </div>
        </SoftCard>
      ) : null}

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <StatCard
          eyebrow="Active seats"
          value={String(activeCount)}
          description={activeSeatsEaseSubLabel(seatLimit, planLabel)}
        />
        <StatCard
          eyebrow="Pending invites"
          value={String(pendingCount)}
          description={pendingInvitesEaseSubLabel(loginPeople)}
        />
      </div>

      {importOpen && canManage ? (
        <SoftCard className="mb-3.5">
          <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
            <div>
              <h3
                className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                Import roster
              </h3>
              <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
                Upload or paste leadership roles and committees for this
                organization.
              </p>
            </div>
            <button
              type="button"
              className={btnGhostClassName}
              onClick={() => setImportOpen(false)}
            >
              Close
            </button>
          </div>
          <OrganizationRosterImportPanel embedded />
        </SoftCard>
      ) : null}

      <SoftCard className="mb-3.5">
        <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
          <div>
            <h3
              className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Roles & permissions
            </h3>
            <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
              What each access role can do. Soft summary — not a dense admin
              matrix.
            </p>
          </div>
          {canEditAccessTemplates ? (
            <button
              type="button"
              className={`${btnSecondaryClassName} ${btnSmClassName}`}
              onClick={() => setRolesEditorOpen(true)}
            >
              Edit roles
            </button>
          ) : null}
        </div>

        {rolePills.length === 0 ? (
          <p className="m-0 text-sm text-[#5c554c]">
            No access roles configured yet.
          </p>
        ) : (
          <>
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Access roles"
            >
              {rolePills.map((template) => {
                const active = template.id === activeRoleId;
                const count = roleCounts.get(template.id) ?? 0;
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-role={template.id}
                    className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold transition-all duration-100 hover:-translate-y-px ${
                      active
                        ? "border-[#2f4a3c] bg-[#2f4a3c] text-[#f6f2eb]"
                        : "border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.7)] text-[#5c554c] hover:text-[#2a2622]"
                    }`}
                    onClick={() => setSelectedRoleId(template.id)}
                  >
                    {template.displayName}
                    <span className="ml-1.5 text-xs font-semibold opacity-70">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeRole ? (
              <div>
                <p className="mb-3 text-[13px] leading-snug text-[#5c554c]">
                  {activeRole.description ||
                    "Permissions for this access role."}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUMMARY_PERMISSION_KEYS.map((key) => {
                    const on = Boolean(activeRole.permissions[key]);
                    const assignedOnlyHint =
                      key === "view_all_events" &&
                      !on &&
                      (activeRole.permissions.view_assigned_events_only ||
                        activeRole.permissions.access_assigned_events_only)
                        ? "Assigned events only"
                        : null;
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 ${
                          on
                            ? "border-[rgba(47,74,60,0.12)] bg-[rgba(47,74,60,0.08)]"
                            : "border-transparent bg-[rgba(246,242,235,0.55)]"
                        }`}
                      >
                        <span
                          className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                            on
                              ? "bg-[#2f4a3c] text-[#f6f2eb]"
                              : "bg-[rgba(122,113,102,0.14)] text-[#7a7166]"
                          }`}
                        >
                          {on ? "✓" : "–"}
                        </span>
                        <span>
                          <span
                            className={`text-[13px] ${
                              on
                                ? "font-bold text-[#2a2622]"
                                : "font-semibold text-[#7a7166]"
                            }`}
                          >
                            {ACCESS_PERMISSION_LABELS[key]}
                          </span>
                          {assignedOnlyHint ? (
                            <span className="mt-0.5 block text-[11px] font-medium text-[#7a7166]">
                              {assignedOnlyHint}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </SoftCard>

      <SoftCard>
        <div className="mb-3.5">
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            People
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            Open anyone to link events and give access.
          </p>
        </div>

        {loginPeople.length === 0 ? (
          <p className="m-0 text-sm text-[#5c554c]">
            No login seats yet.{" "}
            {canManage
              ? "Invite your board or import a roster to get started."
              : "Ask an admin to invite you."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {loginPeople.map((member, index) => {
              const isSelf = isCurrentUserTeamMember(
                member,
                currentUserEmail,
              );
              const status = peopleLoginStatus(member);
              const tone = AVATAR_TONES[index % AVATAR_TONES.length];
              const linkedCount = peopleRelatedEventIds(member).length;

              return (
                <button
                  key={member.id}
                  type="button"
                  data-person={personDeepLinkKeys(member)[1] ?? member.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[rgba(246,242,235,0.55)] px-3.5 py-3 text-left transition-all duration-100 hover:-translate-y-px hover:border-[rgba(47,74,60,0.14)] hover:bg-[rgba(246,242,235,0.95)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f4a3c]"
                  onClick={() => openPerson(member)}
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${tone}`}
                    aria-hidden
                  >
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#2a2622]">
                      {member.displayName}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#7a7166]">
                      {peopleEaseRoleLine(member)}
                    </div>
                    {linkedCount > 0 ? (
                      <div className="mt-1 text-[11px] font-bold text-[#2a7a86]">
                        {linkedCount} event{linkedCount === 1 ? "" : "s"}{" "}
                        linked
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-1" />
                  {isSelf ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]">
                      You
                    </span>
                  ) : status === "invited" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(196,146,46,0.16)] px-2.5 py-1 text-xs font-bold text-[#7a5a12]">
                      Pending
                    </span>
                  ) : (
                    <span className={btnGhostClassName}>Open</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </SoftCard>

      <SettingsEaseTeamAccessPersonDrawer
        member={drawerMember}
        open={Boolean(drawerMember)}
        onClose={closePerson}
        activeTab={drawerTab}
        onTabChange={handleDrawerTabChange}
        events={events}
        accessTemplates={accessTemplates}
        canManage={canManage}
        canEditAccessTemplates={canEditAccessTemplates}
        avatarToneIndex={drawerAvatarIndex}
        onEditProfile={() => {
          if (!drawerMember) return;
          openEdit(drawerMember);
        }}
        onGiveAccess={() => {
          if (!drawerMember) return;
          openGiveAccess(drawerMember);
        }}
        onResendInvite={() => {
          if (!drawerMember) return;
          handleResendInvite(drawerMember);
        }}
        onSaveAccessLevel={(templateId) =>
          drawerMember
            ? handleSaveAccessLevel(drawerMember, templateId)
            : Promise.resolve("No person selected.")
        }
        onSaveEventAssignments={(eventIds) =>
          drawerMember
            ? handleSaveEventAssignments(drawerMember, eventIds)
            : Promise.resolve("No person selected.")
        }
      />

      {rolesEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,38,34,0.28)] p-4 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Close roles editor"
            className="absolute inset-0"
            onClick={() => setRolesEditorOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#f6f2eb] shadow-[0_20px_48px_rgba(42,38,34,0.12)]">
            <div className="flex items-start justify-between gap-3 border-b border-[rgba(42,38,34,0.1)] px-[22px] py-5">
              <div>
                <h2
                  className="m-0 text-2xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={{
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                  }}
                >
                  Edit roles
                </h2>
                <p className="mt-1 mb-0 text-[13px] text-[#5c554c]">
                  Access templates control what each login role can do.
                </p>
              </div>
              <button
                type="button"
                className={btnGhostClassName}
                onClick={() => setRolesEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-[22px] py-5">
              <TeamAccessAccessTemplatesPanel
                templates={accessTemplates}
                canEdit={canEditAccessTemplates}
              />
            </div>
          </div>
        </div>
      ) : null}

      <TeamAccessInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roles={workspace.roles}
        committees={workspace.committees}
        events={events}
        canProvisionAccounts={canProvisionAccounts}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />

      <TeamAccessGiveAppAccessModal
        open={giveAppAccessOpen}
        onClose={() => {
          setGiveAppAccessOpen(false);
          setGiveAppAccessMember(null);
        }}
        member={giveAppAccessMember}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
      />

      <TeamAccessEditMemberModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditMember(null);
        }}
        member={editMember}
        roles={workspace.roles}
        committees={workspace.committees}
        workspace={workspace}
        accessLabels={accessLabels}
        accessTemplates={accessTemplates}
        currentUserEmail={currentUserEmail}
      />
    </section>
  );
}
