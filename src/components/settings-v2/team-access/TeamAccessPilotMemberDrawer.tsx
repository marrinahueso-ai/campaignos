"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { TeamAccessPilotChangeAccessModal } from "@/components/settings-v2/team-access/TeamAccessPilotChangeAccessModal";
import { TeamAccessPilotEventPicker } from "@/components/settings-v2/team-access/TeamAccessPilotEventPicker";
import {
  deriveEventAccessMode,
  eventAccessModeLabel,
  isAssignedOnlyAccess,
} from "@/components/settings-v2/team-access/team-access-event-mode";
import {
  AVATAR_TONES,
  pilotBtnGhost,
  pilotBtnPrimary,
  pilotBtnSecondary,
  pilotSerif,
  pilotSectionLabel,
} from "@/components/settings-v2/team-access/team-access-pilot-theme";
import {
  canResendTeamInvite,
  formatLastLoggedInLabel,
  formatMemberEmail,
  formatMemberPhone,
  isCurrentUserTeamMember,
  peopleLoginStatus,
  peopleRelatedEventIds,
  type UnifiedTeamMember,
} from "@/components/settings-v2/team-access/team-access-utils";
import {
  ACCESS_PERMISSION_KEYS,
  ACCESS_PERMISSION_LABELS,
  type AccessTemplate,
} from "@/lib/access-templates/types";
import { isInviteExpired } from "@/lib/auth/invite-constants";
import { cn } from "@/lib/utils/cn";

export type PilotMemberDrawerEvent = {
  id: string;
  title: string;
  date?: string | null;
  status?: string | null;
};

interface TeamAccessPilotMemberDrawerProps {
  member: UnifiedTeamMember | null;
  open: boolean;
  onClose: () => void;
  events: PilotMemberDrawerEvent[];
  accessTemplates: AccessTemplate[];
  canManage: boolean;
  avatarToneIndex?: number;
  currentUserEmail?: string | null;
  inviteFeedback?: {
    tone: "success" | "warning" | "error";
    message: string;
    inviteUrl?: string | null;
  } | null;
  onDismissInviteFeedback?: () => void;
  resendPending?: boolean;
  actionPending?: boolean;
  onEditProfile: () => void;
  onResendInvite: () => void;
  onCancelInvite: () => void;
  onCopyInviteLink?: (url: string) => void;
  onPause: () => void;
  onRestore: () => void;
  onRemove: () => void;
  onResetLogin?: () => void;
  resetLoginPending?: boolean;
  onSaveAccessLevel: (templateId: string) => Promise<string | null>;
  onSaveEventAssignments: (eventIds: string[]) => Promise<string | null>;
}

type PilotMemberStatus = {
  label: string;
  chipClass: string;
  description: string;
};

function parseEventDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthDay(date: string | null | undefined): {
  month: string;
  day: string;
} {
  const parsed = parseEventDate(date);
  if (!parsed) {
    return { month: "—", day: "—" };
  }
  return {
    month: parsed.toLocaleDateString("en-US", { month: "short" }),
    day: String(parsed.getDate()),
  };
}

function resolvePilotMemberStatus(member: UnifiedTeamMember): PilotMemberStatus {
  const login = peopleLoginStatus(member);
  if (login === "active") {
    return {
      label: "Active",
      chipClass: "bg-[#eef2f0] text-[#586c63]",
      description: "Can sign in and work in this organization.",
    };
  }

  if (login === "inactive") {
    return {
      label: "Paused",
      chipClass: "bg-[#f9f2f0] text-[#c07a67]",
      description: "They can't sign in until access is restored.",
    };
  }

  if (login === "invited") {
    const expired = isInviteExpired(member.raw?.inviteExpiresAt);
    if (expired) {
      return {
        label: "Invite expired",
        chipClass: "bg-[#f9f2f0] text-[#c07a67]",
        description:
          "Their invite link has expired. Resend to give them a new link.",
      };
    }
    return {
      label: "Pending",
      chipClass: "bg-yellow-50 text-[#d4af37]",
      description: "Invitation sent — waiting for them to join.",
    };
  }

  return {
    label: "No login yet",
    chipClass: "bg-[#f5f2eb] text-[#737373]",
    description: "They are on the roster but do not have Hey Ralli access yet.",
  };
}

function signInMethodLabel(member: UnifiedTeamMember): string {
  if (member.username) {
    return "Username & password";
  }
  const login = peopleLoginStatus(member);
  if (login === "invited" || member.status === "invited") {
    return "Email invite";
  }
  if (login === "active" || login === "inactive") {
    return "Email & password / Google";
  }
  return "—";
}

function formatInviteExpiry(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const expired = isInviteExpired(expiresAt);
  const datePart = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return expired ? `Expired ${datePart}` : `Expires ${datePart}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className={pilotSectionLabel}>{title}</h3>
      {children}
    </section>
  );
}

export function TeamAccessPilotMemberDrawer({
  member,
  open,
  onClose,
  events,
  accessTemplates,
  canManage,
  avatarToneIndex = 0,
  currentUserEmail,
  inviteFeedback = null,
  onDismissInviteFeedback,
  resendPending = false,
  actionPending = false,
  onEditProfile,
  onResendInvite,
  onCancelInvite,
  onCopyInviteLink,
  onPause,
  onRestore,
  onRemove,
  onResetLogin,
  resetLoginPending = false,
  onSaveAccessLevel,
  onSaveEventAssignments,
}: TeamAccessPilotMemberDrawerProps) {
  const [showPermissions, setShowPermissions] = useState(false);
  const [manageEvents, setManageEvents] = useState(false);
  const [changeAccessOpen, setChangeAccessOpen] = useState(false);
  const [draftEventIds, setDraftEventIds] = useState<string[]>([]);
  const [eventError, setEventError] = useState<string | null>(null);
  const [isSavingEvents, startSaveEvents] = useTransition();

  useEffect(() => {
    if (!open || !member) return;
    setShowPermissions(false);
    setManageEvents(false);
    setChangeAccessOpen(false);
    setDraftEventIds(member.assignedEventIds ?? []);
    setEventError(null);
  }, [open, member]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const currentTemplate = useMemo(() => {
    if (!member) return null;
    const templateId = member.accessTemplateId ?? member.accessLevel;
    return accessTemplates.find((template) => template.id === templateId) ?? null;
  }, [member, accessTemplates]);

  if (!open || !member) {
    return null;
  }

  const tone = AVATAR_TONES[avatarToneIndex % AVATAR_TONES.length];
  const pilotStatus = resolvePilotMemberStatus(member);
  const isSelf = isCurrentUserTeamMember(member, currentUserEmail);
  const login = peopleLoginStatus(member);
  const inviteExpired =
    member.status === "invited" && isInviteExpired(member.raw?.inviteExpiresAt);
  const showResend =
    canManage &&
    (canResendTeamInvite(member, canManage) ||
      (member.status === "invited" && inviteExpired));
  const showCancelInvite =
    canManage && member.status === "invited" && Boolean(member.raw);
  const showPause = canManage && member.status === "active" && Boolean(member.raw);
  const showRestore =
    canManage && member.status === "deactivated" && Boolean(member.raw);
  const showRemove =
    canManage && Boolean(member.raw) && !isSelf && member.status !== "invited";

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const relatedEventIds = peopleRelatedEventIds(member);
  const linkedEvents = relatedEventIds
    .map(
      (id) =>
        eventsById.get(id) ?? {
          id,
          title: "Assigned event",
          date: null,
          status: null,
        },
    )
    .filter(Boolean);

  const assignedOnly =
    currentTemplate != null && isAssignedOnlyAccess(currentTemplate.permissions);
  const showAssignedOnlyWarning =
    assignedOnly && relatedEventIds.length === 0 && !member.isRosterOnly;

  const inviteExpiryLabel =
    member.status === "invited"
      ? formatInviteExpiry(member.raw?.inviteExpiresAt)
      : null;

  function handleSaveEvents() {
    startSaveEvents(async () => {
      setEventError(null);
      const error = await onSaveEventAssignments(draftEventIds);
      if (error) {
        setEventError(error);
        return;
      }
      setManageEvents(false);
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <button
          type="button"
          aria-label="Close drawer"
          className="absolute inset-0 bg-[rgba(32,27,23,0.35)] backdrop-blur-[2px]"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="pilot-member-drawer-title"
          className="relative flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl"
        >
          <div className="flex-1 overflow-y-auto px-8 pb-8 pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-base font-extrabold",
                    tone,
                  )}
                  aria-hidden
                >
                  {member.initials}
                </div>
                <div className="min-w-0">
                  <h2
                    id="pilot-member-drawer-title"
                    className="text-2xl font-bold tracking-tight text-[#201b17]"
                    style={{ fontFamily: pilotSerif }}
                  >
                    {member.displayName}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-[#737373]">
                    {formatMemberEmail(member)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl text-[#737373] transition hover:bg-[#f5f2eb] hover:text-[#201b17]"
                onClick={onClose}
              >
                ×
              </button>
            </div>

            {canManage ? (
              <button
                type="button"
                className={cn(pilotBtnSecondary, "mt-5 px-5 py-3 text-xs")}
                onClick={onEditProfile}
              >
                Edit profile
              </button>
            ) : null}

            {inviteFeedback ? (
              <div
                className={cn(
                  "mt-4 rounded-2xl border px-4 py-3 text-sm font-medium",
                  inviteFeedback.tone === "error"
                    ? "border-[#c07a67]/30 bg-[#f9f2f0] text-[#c07a67]"
                    : inviteFeedback.tone === "warning"
                      ? "border-[#d4af37]/35 bg-[#fdf8e8] text-[#9a7b1a]"
                      : "border-[#586c63]/25 bg-[#eef2f0] text-[#586c63]",
                )}
                role={inviteFeedback.tone === "error" ? "alert" : "status"}
              >
                <p>{inviteFeedback.message}</p>
                {inviteFeedback.inviteUrl ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 break-all text-xs text-[#737373]">
                      {inviteFeedback.inviteUrl}
                    </p>
                    {onCopyInviteLink ? (
                      <button
                        type="button"
                        className="text-xs font-bold underline"
                        onClick={() =>
                          onCopyInviteLink(inviteFeedback.inviteUrl!)
                        }
                      >
                        Copy link
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {onDismissInviteFeedback ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-bold underline opacity-80 hover:opacity-100"
                    onClick={onDismissInviteFeedback}
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 space-y-8">
              <Section title="Person">
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-[#737373]">PTO title</dt>
                    <dd className="text-right font-bold text-[#201b17]">
                      {member.organizationRoleName?.trim() ||
                        member.orgRoleLabel ||
                        "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="font-medium text-[#737373]">Phone</dt>
                    <dd className="text-right font-bold text-[#201b17]">
                      {formatMemberPhone(member)}
                    </dd>
                  </div>
                </dl>
              </Section>

              <Section title="Status">
                <div className="space-y-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                      pilotStatus.chipClass,
                    )}
                  >
                    {pilotStatus.label}
                  </span>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-[#737373]">
                    {pilotStatus.description}
                  </p>
                  {login === "active" ? (
                    <p className="mt-1 text-xs font-medium text-[#737373]/80">
                      {formatLastLoggedInLabel(member.lastActive)}
                    </p>
                  ) : null}
                </div>
              </Section>

              {!member.isRosterOnly ? (
                <Section title="Access">
                  <div className="rounded-2xl border border-[#e5e1d8] bg-[#fdfcf7] p-4">
                    <p className="text-base font-bold text-[#201b17]">
                      {currentTemplate?.displayName ?? member.accessLabel}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#737373]">
                      {currentTemplate?.description ||
                        (currentTemplate
                          ? eventAccessModeLabel(
                              deriveEventAccessMode(currentTemplate.permissions),
                            )
                          : member.accessLabel)}
                    </p>
                    {canManage ? (
                      <button
                        type="button"
                        className={cn(pilotBtnSecondary, "mt-4 w-full py-3 text-xs")}
                        disabled={actionPending}
                        onClick={() => setChangeAccessOpen(true)}
                      >
                        Change access
                      </button>
                    ) : null}
                    {currentTemplate ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="w-full rounded-xl border border-[#e5e1d8] py-2.5 text-xs font-bold text-[#201b17] transition hover:bg-[#f5f2eb]"
                          onClick={() => setShowPermissions((value) => !value)}
                        >
                          {showPermissions ? "Hide permissions" : "See permissions"}
                        </button>
                        {showPermissions ? (
                          <ul className="mt-3 space-y-1.5 rounded-2xl border border-[#e5e1d8] bg-[#f5f2eb]/40 p-4 text-sm">
                            <li className="font-medium text-[#737373]">
                              Events:{" "}
                              <span className="font-bold text-[#201b17]">
                                {eventAccessModeLabel(
                                  deriveEventAccessMode(currentTemplate.permissions),
                                )}
                              </span>
                            </li>
                            {ACCESS_PERMISSION_KEYS.filter(
                              (key) =>
                                key !== "view_all_events" &&
                                key !== "view_assigned_events_only" &&
                                key !== "access_assigned_events_only",
                            ).map((key) => (
                              <li
                                key={key}
                                className={
                                  currentTemplate.permissions[key]
                                    ? "font-medium text-[#201b17]"
                                    : "text-[#737373]/70"
                                }
                              >
                                {currentTemplate.permissions[key] ? "✓" : "—"}{" "}
                                {ACCESS_PERMISSION_LABELS[key]}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Section>
              ) : null}

              <Section title="Events">
                {showAssignedOnlyWarning ? (
                  <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    This role can only work on assigned events. Without any
                    events linked, they won&apos;t be able to open or edit events.
                  </div>
                ) : null}

                {manageEvents && canManage ? (
                  <div className="space-y-4 rounded-2xl border border-[#e5e1d8] bg-[#fdfcf7] p-4">
                    <TeamAccessPilotEventPicker
                      events={events}
                      selectedIds={draftEventIds}
                      onChange={(ids) => {
                        setDraftEventIds(ids);
                        setEventError(null);
                      }}
                      disabled={isSavingEvents || actionPending}
                      assignedOnlyWarning={assignedOnly}
                    />
                    {eventError ? (
                      <p className="text-sm font-medium text-[#c07a67]" role="alert">
                        {eventError}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className={cn(pilotBtnPrimary, "flex-1 py-3 text-xs")}
                        disabled={isSavingEvents || actionPending}
                        onClick={handleSaveEvents}
                      >
                        {isSavingEvents ? "Saving…" : "Save events"}
                      </button>
                      <button
                        type="button"
                        className={cn(pilotBtnSecondary, "flex-1 py-3 text-xs")}
                        disabled={isSavingEvents}
                        onClick={() => {
                          setManageEvents(false);
                          setDraftEventIds(member.assignedEventIds ?? []);
                          setEventError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {linkedEvents.length === 0 ? (
                      <p className="text-sm font-medium text-[#737373]">
                        No events linked yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {linkedEvents.map((event) => {
                          const { month, day } = formatMonthDay(event.date);
                          return (
                            <div
                              key={event.id}
                              className="flex items-center gap-4 rounded-2xl border border-[#e5e1d8] bg-white p-4"
                            >
                              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f5f2eb] text-[#201b17]">
                                <span className="text-[9px] font-bold uppercase leading-none">
                                  {month}
                                </span>
                                <span className="text-sm font-bold leading-none">
                                  {day}
                                </span>
                              </div>
                              <span className="min-w-0 flex-1 truncate font-bold text-[#201b17]">
                                {event.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {canManage ? (
                      <button
                        type="button"
                        className={cn(pilotBtnSecondary, "mt-3 w-full py-3 text-xs")}
                        onClick={() => setManageEvents(true)}
                      >
                        Manage
                      </button>
                    ) : null}
                  </>
                )}
              </Section>

              {!member.isRosterOnly ? (
                <Section title="Account">
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="font-medium text-[#737373]">Sign-in method</dt>
                      <dd className="text-right font-bold text-[#201b17]">
                        {signInMethodLabel(member)}
                      </dd>
                    </div>
                    {member.username ? (
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-[#737373]">Username</dt>
                        <dd className="text-right font-bold text-[#201b17]">
                          {member.username}
                        </dd>
                      </div>
                    ) : null}
                    {inviteExpiryLabel ? (
                      <div className="flex justify-between gap-4">
                        <dt className="font-medium text-[#737373]">Invite</dt>
                        <dd className="text-right font-bold text-[#201b17]">
                          {inviteExpiryLabel}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {canManage && member.username && onResetLogin ? (
                    <button
                      type="button"
                      className={cn(pilotBtnSecondary, "mt-4 w-full py-3 text-sm")}
                      disabled={actionPending || resetLoginPending}
                      onClick={onResetLogin}
                    >
                      {resetLoginPending ? "Resetting…" : "Reset login"}
                    </button>
                  ) : null}
                </Section>
              ) : null}
            </div>
          </div>

          {canManage &&
          (showResend ||
            showCancelInvite ||
            showPause ||
            showRestore ||
            showRemove) ? (
            <div className="space-y-2 border-t border-[#e5e1d8] bg-[#fdfcf7] px-8 py-6">
              {showResend &&
              (member.status === "invited" || inviteExpired) ? (
                <>
                  <button
                    type="button"
                    className={cn(pilotBtnPrimary, "w-full py-3.5 text-sm")}
                    disabled={resendPending || actionPending}
                    onClick={onResendInvite}
                  >
                    {resendPending ? "Sending…" : "Resend invite"}
                  </button>
                  {showCancelInvite ? (
                    <button
                      type="button"
                      className={cn(pilotBtnGhost, "w-full py-3 text-sm text-[#c07a67]")}
                      disabled={actionPending}
                      onClick={onCancelInvite}
                    >
                      Cancel invitation
                    </button>
                  ) : null}
                </>
              ) : null}

              {showPause ? (
                <>
                  <button
                    type="button"
                    className={cn(
                      pilotBtnSecondary,
                      "w-full py-3.5 text-sm text-[#c07a67]",
                    )}
                    disabled={actionPending}
                    onClick={onPause}
                  >
                    Pause access
                  </button>
                  {showRemove ? (
                    <button
                      type="button"
                      className={cn(pilotBtnGhost, "w-full py-3 text-sm text-[#c07a67]")}
                      disabled={actionPending}
                      onClick={onRemove}
                    >
                      Remove from organization
                    </button>
                  ) : null}
                </>
              ) : null}

              {showRestore ? (
                <>
                  <button
                    type="button"
                    className={cn(pilotBtnPrimary, "w-full py-3.5 text-sm")}
                    disabled={actionPending}
                    onClick={onRestore}
                  >
                    Restore access
                  </button>
                  {showRemove ? (
                    <button
                      type="button"
                      className={cn(pilotBtnGhost, "w-full py-3 text-sm text-[#c07a67]")}
                      disabled={actionPending}
                      onClick={onRemove}
                    >
                      Remove from organization
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      <TeamAccessPilotChangeAccessModal
        open={changeAccessOpen}
        onClose={() => setChangeAccessOpen(false)}
        templates={accessTemplates}
        currentTemplateId={member.accessTemplateId ?? member.accessLevel}
        pending={actionPending}
        onSave={onSaveAccessLevel}
      />
    </>
  );
}
