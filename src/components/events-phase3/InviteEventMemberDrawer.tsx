"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  formatInviteEventContextDate,
  inviteMemberInitials,
  isValidInviteEmail,
  validateInviteEventMemberForm,
  type InviteEventMemberLookup,
  type InviteEventMemberRoleOption,
  type InviteEventMemberSuccessKind,
} from "@/lib/events-phase3/invite-event-member";
import {
  addExistingMemberToEventAction,
  inviteEventTeamMemberAction,
  loadInviteEventMemberRolesAction,
  lookupEventInviteMemberByEmailAction,
} from "@/lib/events-phase3/invite-event-member-actions";

export type InviteEventMemberDrawerEvent = {
  id: string;
  title: string;
  date: string;
  imageUrl?: string | null;
};

type DrawerView = "form" | "existing" | "success";

interface InviteEventMemberDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: InviteEventMemberDrawerEvent;
  onMemberAdded?: () => void;
}

const fieldLabelClass =
  "text-xs font-semibold tracking-wider text-[#1c352d] uppercase";
const fieldInputClass =
  "w-full rounded-lg border border-[#e6dfd5] bg-white px-4 py-3 text-sm text-[#1c352d] outline-none transition placeholder:text-[#5e6b65]/40 focus:border-[#8ea89d] focus:ring-1 focus:ring-[#8ea89d]";

export function InviteEventMemberDrawer({
  open,
  onOpenChange,
  event,
  onMemberAdded,
}: InviteEventMemberDrawerProps) {
  const router = useRouter();
  const titleId = useId();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<DrawerView>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const [roles, setRoles] = useState<InviteEventMemberRoleOption[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [lookup, setLookup] = useState<InviteEventMemberLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successKind, setSuccessKind] =
    useState<InviteEventMemberSuccessKind>("invited");
  const [successName, setSuccessName] = useState("");
  const [successRoleLabel, setSuccessRoleLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lookupPending, startLookupTransition] = useTransition();

  const resetForm = useCallback(() => {
    setView("form");
    setName("");
    setEmail("");
    setRoleId("");
    setRoleOpen(false);
    setLookup(null);
    setError(null);
    setSuccessKind("invited");
    setSuccessName("");
    setSuccessRoleLabel("");
  }, []);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });

    if (rolesLoaded) {
      setRoleId((current) => current || roles[0]?.id || "");
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    startTransition(async () => {
      const result = await loadInviteEventMemberRolesAction();
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRoles(result.roles);
      setRolesLoaded(true);
      setRoleId((current) => current || result.roles[0]?.id || "");
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [open, resetForm, rolesLoaded, roles]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (roleOpen) {
          setRoleOpen(false);
          return;
        }
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, roleOpen]);

  const selectedRole = roles.find((role) => role.id === roleId) ?? null;
  const eventDateLabel = formatInviteEventContextDate(event.date);

  function runEmailLookup(nextEmail: string) {
    if (!isValidInviteEmail(nextEmail)) {
      setLookup(null);
      if (view === "existing") setView("form");
      return;
    }

    startLookupTransition(async () => {
      const result = await lookupEventInviteMemberByEmailAction({
        email: nextEmail,
        eventId: event.id,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      if (result.member?.status === "active") {
        setLookup(result.member);
        setView("existing");
        setName(result.member.displayName?.trim() || name);
        return;
      }
      setLookup(null);
      if (view === "existing") setView("form");
    });
  }

  function handleSendInvite() {
    if (isPending) return;
    const validationError = validateInviteEventMemberForm({
      name,
      email,
      roleId,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    startTransition(async () => {
      // Re-check so we never duplicate an org invite for an active member.
      const current = await lookupEventInviteMemberByEmailAction({
        email,
        eventId: event.id,
      });
      if (!current.success) {
        setError(current.error);
        return;
      }
      if (current.member?.status === "active") {
        setLookup(current.member);
        setView("existing");
        return;
      }

      const result = await inviteEventTeamMemberAction({
        email,
        fullName: name,
        campaignRole: roleId,
        eventId: event.id,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to send invite.");
        return;
      }

      setSuccessKind("invited");
      setSuccessName(result.inviteeName ?? name.trim());
      setSuccessRoleLabel(
        result.roleLabel ?? selectedRole?.label ?? "Team member",
      );
      setView("success");
      onMemberAdded?.();
      router.refresh();
    });
  }

  function handleAddToEvent() {
    if (isPending || !lookup) return;
    setError(null);
    startTransition(async () => {
      const result = await addExistingMemberToEventAction({
        organizationUserId: lookup.membershipId,
        eventId: event.id,
      });
      if (!result.success) {
        setError(result.error ?? "Unable to add to event.");
        return;
      }

      setSuccessKind("added");
      setSuccessName(result.memberName ?? lookup.displayName ?? lookup.email);
      setSuccessRoleLabel(result.roleLabel ?? lookup.roleLabel);
      setView("success");
      onMemberAdded?.();
      router.refresh();
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close invite drawer overlay"
        className="absolute inset-0 bg-[#1c352d]/20 backdrop-blur-[2px]"
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-[#e6dfd5] bg-white shadow-2xl"
        data-testid="invite-event-member-drawer"
      >
        <header className="flex items-start justify-between border-b border-[#e6dfd5] p-8">
          <div>
            <h2
              id={titleId}
              className="font-display text-2xl text-[#1c352d]"
            >
              Invite team member
            </h2>
            <p className="mt-1 text-sm text-[#5e6b65]">
              Invite someone to help with this event.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5e6b65] transition-colors hover:bg-[#faf8f5]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {view === "success" ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e6efe9] text-[#5a7568]">
              <Send className="h-10 w-10" aria-hidden />
            </div>
            <h3 className="font-display text-3xl text-[#1c352d]">
              {successKind === "invited" ? "Invitation sent" : "Added to event"}
            </h3>
            <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-[#5e6b65]">
              {successName} has been{" "}
              {successKind === "invited" ? "invited to" : "added to"}{" "}
              <span className="font-semibold text-[#1c352d]">{event.title}</span>
              .
            </p>
            <div className="mt-10 w-full rounded-xl border border-[#e6dfd5] bg-[#faf8f5] p-4 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#ece2d4] text-xs font-bold text-[#1c352d]">
                  {inviteMemberInitials(successName, email)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1c352d]">
                    {successName}
                  </p>
                  <p className="text-xs text-[#5e6b65] italic">
                    {successRoleLabel} ·{" "}
                    {successKind === "invited"
                      ? "Invite pending"
                      : "Access granted"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-8">
            <EventAccessCard
              title={event.title}
              dateLabel={eventDateLabel}
              imageUrl={event.imageUrl}
            />

            {view === "existing" && lookup ? (
              <ExistingMemberBody
                lookup={lookup}
                email={lookup.email}
              />
            ) : (
              <FormBody
                name={name}
                email={email}
                roleId={roleId}
                roleOpen={roleOpen}
                roles={roles}
                selectedRole={selectedRole}
                nameInputRef={nameInputRef}
                lookupPending={lookupPending}
                onNameChange={setName}
                onEmailChange={(value) => {
                  setEmail(value);
                  if (lookup) {
                    setLookup(null);
                  }
                }}
                onEmailBlur={() => runEmailLookup(email)}
                onToggleRole={() => setRoleOpen((open) => !open)}
                onSelectRole={(id) => {
                  setRoleId(id);
                  setRoleOpen(false);
                }}
              />
            )}

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {view === "existing" ? (
              <p className="text-xs leading-relaxed text-[#5e6b65] italic">
                This person is already a member of your organization. Adding
                them will grant access to this event immediately.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-[#5e6b65] italic">
                Once they accept, they&apos;ll have access to this event based
                on the role selected above.
              </p>
            )}

            <div className="pt-2">
              <Link
                href="/settings/team-access"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5a7568] transition-colors hover:text-[#1c352d]"
              >
                Manage advanced access
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        )}

        <footer className="flex items-center gap-4 border-t border-[#e6dfd5] bg-[#faf8f5]/30 p-8">
          {view === "success" ? (
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-full bg-[#1c352d] py-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5e6b65]"
            >
              Done
            </button>
          ) : view === "existing" && lookup ? (
            <>
              <button
                type="button"
                disabled={isPending || lookup.alreadyOnEvent}
                onClick={handleAddToEvent}
                className="flex-1 rounded-full bg-[#1c352d] py-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5e6b65] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? "Adding…"
                  : lookup.alreadyOnEvent
                    ? "Already on this event"
                    : "Add to this event"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={close}
                className="px-6 py-4 text-sm font-semibold text-[#5e6b65] transition-colors hover:text-[#1c352d]"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSendInvite}
                className="flex-1 rounded-full bg-[#1c352d] py-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5e6b65] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Sending…" : "Send invite"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={close}
                className="px-6 py-4 text-sm font-semibold text-[#5e6b65] transition-colors hover:text-[#1c352d]"
              >
                Cancel
              </button>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}

function EventAccessCard({
  title,
  dateLabel,
  imageUrl,
}: {
  title: string;
  dateLabel: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="rounded-xl border border-[#e6dfd5] bg-[#faf8f5] p-4">
      <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-[#c5a880] uppercase">
        Event Access
      </p>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#e6dfd5] bg-[#ece2d4]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#5e6b65]">
              Event
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#1c352d]">
            {title}
          </p>
          <p className="text-xs text-[#5e6b65]">{dateLabel}</p>
        </div>
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-[#8ea89d]"
          aria-hidden
        />
      </div>
    </div>
  );
}

function ExistingMemberBody({
  lookup,
  email,
}: {
  lookup: InviteEventMemberLookup;
  email: string;
}) {
  const displayName = lookup.displayName?.trim() || email;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border-2 border-[#8ea89d] bg-[rgba(142,168,157,0.05)] p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#ece2d4] text-sm font-bold text-[#1c352d] shadow-sm">
          {inviteMemberInitials(displayName, email)}
        </div>
        <div>
          <p className="text-base font-semibold text-[#1c352d]">{displayName}</p>
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#5a7568]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Already on your team
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={fieldLabelClass}>Email address</label>
        <div className="rounded-lg border border-[#e6dfd5] bg-[#faf8f5]/50 px-4 py-3 text-sm font-medium text-[#1c352d]">
          {email}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={fieldLabelClass}>Assigned Role</label>
        <div className="flex items-center justify-between rounded-lg border border-[#e6dfd5] bg-[#faf8f5]/50 px-4 py-3 text-sm font-medium text-[#1c352d]">
          {lookup.roleLabel}
          <span className="text-[10px] font-bold tracking-widest text-[#c5a880] uppercase">
            Inherited
          </span>
        </div>
      </div>
    </div>
  );
}

function FormBody({
  name,
  email,
  roleId,
  roleOpen,
  roles,
  selectedRole,
  nameInputRef,
  lookupPending,
  onNameChange,
  onEmailChange,
  onEmailBlur,
  onToggleRole,
  onSelectRole,
}: {
  name: string;
  email: string;
  roleId: string;
  roleOpen: boolean;
  roles: InviteEventMemberRoleOption[];
  selectedRole: InviteEventMemberRoleOption | null;
  nameInputRef: RefObject<HTMLInputElement | null>;
  lookupPending: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onToggleRole: () => void;
  onSelectRole: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="invite-event-member-name" className={fieldLabelClass}>
          Name
        </label>
        <input
          ref={nameInputRef}
          id="invite-event-member-name"
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Jane Smith"
          autoComplete="name"
          className={fieldInputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="invite-event-member-email" className={fieldLabelClass}>
          Email address
        </label>
        <input
          id="invite-event-member-email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          onBlur={onEmailBlur}
          placeholder="jane@school.org"
          autoComplete="email"
          className={fieldInputClass}
          aria-busy={lookupPending}
        />
      </div>

      <div className="relative space-y-1.5">
        <label id="invite-event-member-role-label" className={fieldLabelClass}>
          Role
        </label>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={roleOpen}
          aria-labelledby="invite-event-member-role-label"
          onClick={onToggleRole}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left text-sm transition",
            roleOpen
              ? "rounded-b-none border-2 border-[#8ea89d]"
              : "border border-[#e6dfd5]",
            selectedRole ? "font-medium text-[#1c352d]" : "text-[#5e6b65]/60",
          )}
        >
          <span>{selectedRole?.label ?? "Select a role..."}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#5e6b65] transition",
              roleOpen && "rotate-180 text-[#8ea89d]",
            )}
            aria-hidden
          />
        </button>
        {roleOpen ? (
          <ul
            role="listbox"
            aria-labelledby="invite-event-member-role-label"
            className="absolute top-[calc(100%-1px)] left-0 z-10 w-full overflow-hidden rounded-b-lg border-2 border-t-0 border-[#8ea89d] bg-white py-1 shadow-xl"
          >
            {roles.map((role) => {
              const selected = role.id === roleId;
              return (
                <li key={role.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => onSelectRole(role.id)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "bg-[#e6efe9] font-semibold text-[#5a7568]"
                        : "text-[#5e6b65] hover:bg-[#f4f0ea] hover:text-[#1c352d]",
                    )}
                  >
                    {role.label}
                    {selected ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
