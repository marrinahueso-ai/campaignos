"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { TeamAccessBodyPortal } from "@/components/settings-v2/team-access/TeamAccessBodyPortal";
import {
  canResendTeamInvite,
  formatLastLoggedInLabel,
  formatLastLoggedInValue,
  formatMemberEmail,
  peopleEaseRoleLine,
  peopleLoginStatus,
  peopleRelatedEventIds,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  ACCESS_PERMISSION_DESCRIPTIONS,
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  type AccessPermissionKey,
  type AccessTemplate,
  type AccessTemplatePermissions,
} from "@/lib/access-templates/types";
import { applySafetyLocks } from "@/lib/access-templates/defaults";
import { saveOrganizationAccessTemplateAction } from "@/lib/access-templates/actions";

export type EasePersonDrawerTab = "overview" | "events" | "access";

export type EaseTeamAccessEventOption = {
  id: string;
  title: string;
  date?: string | null;
  status?: string | null;
};

const AVATAR_TONES = [
  "bg-[#2f4a3c] text-[#f6f2eb]",
  "bg-[#c4922e] text-[#2a2622]",
  "bg-[#2a7a86] text-[#fffcf7]",
  "bg-[#6b8171] text-[#fffcf7]",
] as const;

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSmClassName = "px-3.5 py-2 text-xs";

interface SettingsEaseTeamAccessPersonDrawerProps {
  member: UnifiedTeamMember | null;
  open: boolean;
  onClose: () => void;
  activeTab: EasePersonDrawerTab;
  onTabChange: (tab: EasePersonDrawerTab) => void;
  events: EaseTeamAccessEventOption[];
  accessTemplates: AccessTemplate[];
  canManage: boolean;
  canEditAccessTemplates: boolean;
  avatarToneIndex?: number;
  onEditProfile: () => void;
  onGiveAccess: () => void;
  onResendInvite: () => void;
  /** Shown after Resend invite (success, warning, or error). */
  inviteFeedback?: {
    tone: "success" | "warning" | "error";
    message: string;
    inviteUrl?: string | null;
  } | null;
  onDismissInviteFeedback?: () => void;
  resendPending?: boolean;
  /** Icon-only remove; omitted for self or when manage_people is off. */
  onRemove?: () => void;
  onSaveAccessLevel: (templateId: string) => Promise<string | null>;
  onSaveEventAssignments: (eventIds: string[]) => Promise<string | null>;
}

function formatEventWhen(event: EaseTeamAccessEventOption): string {
  const parts: string[] = [];
  if (event.date) {
    const parsed = new Date(`${event.date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      parts.push(
        parsed.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      );
    }
  }
  if (event.status) {
    const status =
      event.status === "published"
        ? "Active"
        : event.status === "scheduled"
          ? "Upcoming"
          : event.status.charAt(0).toUpperCase() + event.status.slice(1);
    parts.push(status);
  }
  return parts.join(" · ") || "Event";
}

function resolvePrimaryTeam(member: UnifiedTeamMember): string {
  const direct = member.committees.find(
    (assignment) => assignment.roleOnCommittee !== "vp",
  );
  if (direct) return direct.committee.name;
  if (member.vpPortfolio) return member.vpPortfolio;
  if (member.committees[0]) return member.committees[0].committee.name;
  return "—";
}

function loginContactLine(member: UnifiedTeamMember): string {
  const status = peopleLoginStatus(member);
  if (status === "invited") return "Invite pending";
  if (status === "active") return "Login enabled";
  if (status === "inactive") return "Inactive";
  return "No login yet";
}

function permissionsEqual(
  left: AccessTemplatePermissions,
  right: AccessTemplatePermissions,
): boolean {
  return ACCESS_PERMISSION_KEYS.every((key) => left[key] === right[key]);
}

export function SettingsEaseTeamAccessPersonDrawer({
  member,
  open,
  onClose,
  activeTab,
  onTabChange,
  events,
  accessTemplates,
  canManage,
  canEditAccessTemplates,
  avatarToneIndex = 0,
  onEditProfile,
  onGiveAccess,
  onResendInvite,
  inviteFeedback = null,
  onDismissInviteFeedback,
  resendPending = false,
  onRemove,
  onSaveAccessLevel,
  onSaveEventAssignments,
}: SettingsEaseTeamAccessPersonDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [draftEventIds, setDraftEventIds] = useState<string[]>([]);
  const [draftAccessId, setDraftAccessId] = useState("");
  const [draftPermissions, setDraftPermissions] =
    useState<AccessTemplatePermissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const selectedTemplate = useMemo(
    () =>
      accessTemplates.find((template) => template.id === draftAccessId) ??
      accessTemplates[0] ??
      null,
    [accessTemplates, draftAccessId],
  );

  useEffect(() => {
    if (!open || !member) {
      setVisible(false);
      return;
    }
    setDraftEventIds(peopleRelatedEventIds(member));
    const accessId = member.accessTemplateId ?? member.accessLevel;
    setDraftAccessId(accessId);
    const template =
      accessTemplates.find((entry) => entry.id === accessId) ?? null;
    setDraftPermissions(template ? { ...template.permissions } : null);
    setError(null);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open, member, accessTemplates]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !member) {
    return null;
  }

  const tone = AVATAR_TONES[avatarToneIndex % AVATAR_TONES.length];
  const status = peopleLoginStatus(member);
  const showResend = canResendTeamInvite(member, canManage);
  const showGiveAccess =
    canManage &&
    (status === "invited" || status === "inactive" || member.isRosterOnly);
  const giveLabel = showResend ? "Resend invite" : "Give access";

  const linkedEvents = events.filter((event) =>
    draftEventIds.includes(event.id),
  );

  const accessDirty =
    draftAccessId !== (member.accessTemplateId ?? member.accessLevel);
  const eventsDirty = (() => {
    const current = new Set(peopleRelatedEventIds(member));
    if (current.size !== draftEventIds.length) return true;
    return draftEventIds.some((id) => !current.has(id));
  })();
  const permissionsDirty = Boolean(
    canEditAccessTemplates &&
      selectedTemplate &&
      draftPermissions &&
      !permissionsEqual(draftPermissions, selectedTemplate.permissions),
  );
  const dirty = accessDirty || eventsDirty || permissionsDirty;

  function toggleEvent(eventId: string) {
    if (!canManage) return;
    setDraftEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
    setError(null);
  }

  function handleAccessRoleChange(nextId: string) {
    setDraftAccessId(nextId);
    const template = accessTemplates.find((entry) => entry.id === nextId);
    setDraftPermissions(template ? { ...template.permissions } : null);
    setError(null);
  }

  function togglePermission(key: AccessPermissionKey) {
    if (!canEditAccessTemplates || !selectedTemplate || !draftPermissions) {
      return;
    }
    let next = { ...draftPermissions, [key]: !draftPermissions[key] };
    if (key === "view_assigned_events_only" && next.view_assigned_events_only) {
      next.view_all_events = false;
      next.access_assigned_events_only = true;
    }
    if (key === "view_all_events" && next.view_all_events) {
      next.view_assigned_events_only = false;
    }
    if (key === "access_assigned_events_only" && !next.access_assigned_events_only) {
      next.view_assigned_events_only = false;
      next.view_all_events = true;
    }
    next = applySafetyLocks(
      selectedTemplate.id,
      next,
      selectedTemplate.baseRole,
    );
    setDraftPermissions(next);
    setError(null);
  }

  function handleSave() {
    if (!canManage || !dirty) {
      onClose();
      return;
    }
    startTransition(async () => {
      setError(null);
      if (permissionsDirty && selectedTemplate && draftPermissions) {
        const result = await saveOrganizationAccessTemplateAction({
          templateId: selectedTemplate.id,
          displayName: selectedTemplate.displayName,
          description: selectedTemplate.description,
          permissions: draftPermissions,
          baseRole: selectedTemplate.baseRole,
        });
        if (!result.success) {
          setError(result.error ?? "Unable to save permissions.");
          return;
        }
      }
      if (accessDirty) {
        const accessError = await onSaveAccessLevel(draftAccessId);
        if (accessError) {
          setError(accessError);
          return;
        }
      }
      if (eventsDirty) {
        const eventsError = await onSaveEventAssignments(draftEventIds);
        if (eventsError) {
          setError(eventsError);
          return;
        }
      }
      onClose();
    });
  }

  return (
    <TeamAccessBodyPortal>
    <div className="fixed inset-0 z-50" data-settings-ease="person-drawer">
      <button
        type="button"
        aria-label="Close person drawer"
        className={`absolute inset-0 bg-[rgba(42,38,34,0.28)] transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-ease-person-title"
        className={`absolute top-0 right-0 bottom-0 flex w-full max-w-[460px] flex-col border-l border-[rgba(42,38,34,0.1)] bg-[#f6f2eb] shadow-[0_20px_48px_rgba(42,38,34,0.12)] transition-transform duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-[22px] pt-[22px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-base font-extrabold ${tone}`}
                aria-hidden
              >
                {member.initials}
              </div>
              <div className="min-w-0">
                <h2
                  id="settings-ease-person-title"
                  className="m-0 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#2a2622]"
                  style={{
                    fontFamily: "var(--font-fraunces), Georgia, serif",
                  }}
                >
                  {member.displayName}
                </h2>
                <p className="mt-1 mb-0 text-[13px] font-semibold text-[#5c554c]">
                  {peopleEaseRoleLine(member)}
                </p>
                <p className="mt-2 mb-0 text-xs leading-snug text-[#7a7166]">
                  {formatMemberEmail(member)}
                  <br />
                  {loginContactLine(member)}
                  <br />
                  {formatLastLoggedInLabel(member.lastActive)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-1.5">
              {onRemove ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={onRemove}
                  aria-label={`Delete ${member.displayName}`}
                  title="Delete"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] text-[#7a7166] transition hover:border-[rgba(166,90,58,0.35)] hover:bg-[rgba(166,90,58,0.12)] hover:text-[#a65a3a] disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] text-[#5c554c]"
                onClick={onClose}
              >
                ✕
              </button>
            </div>
          </div>

          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={`${btnSecondaryClassName} ${btnSmClassName}`}
                onClick={onEditProfile}
              >
                Edit profile
              </button>
              {showGiveAccess || showResend ? (
                <button
                  type="button"
                  className={`${btnPrimaryClassName} ${btnSmClassName}`}
                  disabled={showResend ? resendPending || isPending : isPending}
                  onClick={showResend ? onResendInvite : onGiveAccess}
                >
                  {showResend && resendPending ? "Sending…" : giveLabel}
                </button>
              ) : null}
            </div>
          ) : null}

          {inviteFeedback ? (
            <div
              className={
                inviteFeedback.tone === "error"
                  ? "mt-3 rounded-[14px] border border-[rgba(166,90,58,0.28)] bg-[rgba(166,90,58,0.08)] px-3.5 py-3"
                  : inviteFeedback.tone === "warning"
                    ? "mt-3 rounded-[14px] border border-[rgba(196,146,46,0.35)] bg-[rgba(196,146,46,0.12)] px-3.5 py-3"
                    : "mt-3 rounded-[14px] border border-[rgba(47,74,60,0.22)] bg-[rgba(47,74,60,0.08)] px-3.5 py-3"
              }
              role={inviteFeedback.tone === "error" ? "alert" : "status"}
              data-settings-ease="invite-feedback"
            >
              <p
                className={
                  inviteFeedback.tone === "error"
                    ? "m-0 text-[13px] font-semibold text-[#a65a3a]"
                    : inviteFeedback.tone === "warning"
                      ? "m-0 text-[13px] font-semibold text-[#7a5a12]"
                      : "m-0 text-[13px] font-semibold text-[#2f4a3c]"
                }
              >
                {inviteFeedback.message}
              </p>
              {inviteFeedback.inviteUrl ? (
                <p className="mt-2 mb-0 break-all text-xs leading-snug text-[#5c554c]">
                  {inviteFeedback.inviteUrl}
                </p>
              ) : null}
              {onDismissInviteFeedback ? (
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-[#5c554c] underline hover:text-[#2a2622]"
                  onClick={onDismissInviteFeedback}
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            className="mt-[18px] flex gap-1 overflow-x-auto border-b border-[rgba(42,38,34,0.1)]"
            role="tablist"
            aria-label="Person details"
          >
            {(
              [
                { id: "overview", label: "Overview" },
                {
                  id: "events",
                  label: `Events (${draftEventIds.length})`,
                },
                { id: "access", label: "Access" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`-mb-px whitespace-nowrap border-b-2 bg-transparent px-3 py-2.5 text-[13px] font-bold ${
                  activeTab === tab.id
                    ? "border-[#2f4a3c] text-[#2a2622]"
                    : "border-transparent text-[#7a7166]"
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-[22px] py-[18px] pb-7">
          {activeTab === "overview" ? (
            <div className="animate-[settings-ease-rise_0.25s_ease_both]">
              <div className="flex flex-col gap-2">
                {(
                  [
                    [
                      "Organization title",
                      member.organizationRoleName?.trim() ||
                        member.orgRoleLabel ||
                        "—",
                    ],
                    ["App access", member.accessLabel || "—"],
                    ["Primary team", resolvePrimaryTeam(member)],
                    ["Reports to", member.reportsTo?.trim() || "—"],
                    [
                      "Last logged in",
                      formatLastLoggedInValue(member.lastActive),
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 rounded-[14px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3 text-[13px]"
                  >
                    <dt className="font-semibold text-[#7a7166]">{label}</dt>
                    <dd className="m-0 text-right font-bold text-[#2a2622]">
                      {value}
                    </dd>
                  </div>
                ))}
              </div>
              <p className="mt-4 mb-2.5 text-[13px] leading-snug text-[#5c554c]">
                Linked events
              </p>
              {linkedEvents.length === 0 ? (
                <p className="m-0 text-[13px] leading-snug text-[#5c554c]">
                  No events linked yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {linkedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[rgba(47,74,60,0.35)] bg-[rgba(47,74,60,0.07)] px-3.5 py-3"
                    >
                      <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#2f4a3c] bg-[#2f4a3c] text-[11px] font-extrabold text-[#f6f2eb]">
                        ✓
                      </span>
                      <span>
                        <div className="text-[13px] font-bold text-[#2a2622]">
                          {event.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#7a7166]">
                          {formatEventWhen(event)}
                        </div>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent bg-transparent px-3 py-2 text-xs font-bold text-[#5c554c] hover:text-[#2a2622]"
                onClick={() => onTabChange("events")}
              >
                Manage event links →
              </button>
            </div>
          ) : null}

          {activeTab === "events" ? (
            <div className="animate-[settings-ease-rise_0.25s_ease_both]">
              <p className="mb-3 text-[13px] leading-snug text-[#5c554c]">
                Link the events this person can work on.
              </p>
              {events.length === 0 ? (
                <p className="m-0 text-[13px] text-[#5c554c]">
                  No events yet for this organization.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map((event) => {
                    const on = draftEventIds.includes(event.id);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        disabled={!canManage || isPending}
                        className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3 text-left transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${
                          on
                            ? "border-[rgba(47,74,60,0.35)] bg-[rgba(47,74,60,0.07)]"
                            : "border-[rgba(42,38,34,0.1)] bg-[#fffcf7]"
                        }`}
                        onClick={() => toggleEvent(event.id)}
                      >
                        <span
                          className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] text-[11px] font-extrabold ${
                            on
                              ? "border-[#2f4a3c] bg-[#2f4a3c] text-[#f6f2eb]"
                              : "border-[rgba(42,38,34,0.1)] text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span>
                          <div className="text-[13px] font-bold text-[#2a2622]">
                            {event.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#7a7166]">
                            {formatEventWhen(event)}
                          </div>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "access" ? (
            <div className="animate-[settings-ease-rise_0.25s_ease_both]">
              <label
                className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7a7166]"
                htmlFor="ease-access-role"
              >
                Access role
              </label>
              <select
                id="ease-access-role"
                className="mt-1.5 w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3 text-sm font-semibold text-[#2a2622] disabled:opacity-60"
                value={draftAccessId}
                disabled={!canManage || isPending || member.isRosterOnly}
                onChange={(event) => handleAccessRoleChange(event.target.value)}
              >
                {accessTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.displayName}
                    {template.description ? ` — ${template.description}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-2.5 mb-0 text-[13px] leading-snug text-[#5c554c]">
                Permissions for this role. Changes apply after Save.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {ACCESS_PERMISSION_KEYS.map((key) => {
                  const on = Boolean(draftPermissions?.[key]);
                  const hint =
                    ACCESS_PERMISSION_DESCRIPTIONS[key] ??
                    "Included with this role";
                  const locked =
                    (selectedTemplate?.baseRole === "admin" ||
                      selectedTemplate?.baseRole === "president") &&
                    key === "manage_people";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#2a2622]">
                          {ACCESS_PERMISSION_LABELS[key]}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-[#7a7166]">
                          {locked
                            ? "Always on for Admin and President"
                            : hint}
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={ACCESS_PERMISSION_LABELS[key]}
                        disabled={
                          !canEditAccessTemplates ||
                          isPending ||
                          locked ||
                          !draftPermissions
                        }
                        className={`relative h-[26px] w-11 shrink-0 rounded-full border-none p-0.5 transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${
                          on
                            ? "bg-[#2f4a3c]"
                            : "bg-[rgba(122,113,102,0.28)]"
                        }`}
                        onClick={() => togglePermission(key)}
                      >
                        <span
                          className={`block h-[22px] w-[22px] rounded-full bg-[#fffcf7] shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform duration-150 ${
                            on ? "translate-x-[18px]" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 text-[13px] text-[#a65a3a]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[rgba(42,38,34,0.1)] bg-[rgba(255,252,247,0.75)] px-[22px] py-3.5 pb-[22px]">
          {canManage ? (
            <button
              type="button"
              className={btnPrimaryClassName}
              disabled={isPending || !dirty}
              onClick={handleSave}
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
          ) : null}
          <button
            type="button"
            className={btnSecondaryClassName}
            disabled={isPending}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </aside>
    </div>
    </TeamAccessBodyPortal>
  );
}
