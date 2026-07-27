"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { SignOutForm } from "@/components/auth/SignOutForm";
import {
  eraseAccountAction,
  saveAccountNotificationPreferencesAction,
  updateAccountProfileAction,
  type AccountEraseFormState,
  type AccountProfileFormState,
} from "@/lib/settings-v2/account-actions";
import { ACCOUNT_ERASE_CONFIRMATION } from "@/lib/settings-v2/erase-account";
import type {
  AccountNotificationPreferences,
  SettingsEaseAccountData,
} from "@/lib/settings-v2/account-notification-prefs";
import { cn } from "@/lib/utils/cn";

interface SettingsEaseAccountProps {
  data: SettingsEaseAccountData;
}

const INITIAL_PROFILE_STATE: AccountProfileFormState = {
  error: null,
  success: false,
};

const INITIAL_ERASE_STATE: AccountEraseFormState = {
  error: null,
  success: false,
};

const softCardClassName =
  "rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]";

const fieldControlClassName =
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-3.5 py-[11px] text-sm text-[#2a2622] outline-none transition-[border-color,background,box-shadow] duration-100 focus:border-[rgba(47,74,60,0.35)] focus:bg-[#fffcf7] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.08)] read-only:cursor-default read-only:opacity-90";

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnDangerClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(166,90,58,0.22)] bg-[rgba(166,90,58,0.12)] px-[18px] py-[11px] text-[13px] font-bold text-[#a65a3a] transition-transform duration-100 hover:-translate-y-px";

const frauncesStyle = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
} as const;

type NotificationKey = keyof AccountNotificationPreferences;

const NOTIFICATION_ROWS: {
  key: NotificationKey;
  title: string;
  description: string;
  ariaLabel: string;
}[] = [
  {
    key: "approvalNeedsAttention",
    title: "Approval needs attention",
    description: "When something is waiting on you to approve or revise.",
    ariaLabel: "Toggle approval notifications",
  },
  {
    key: "inboxFollowUps",
    title: "Inbox follow-ups",
    description: "Digest when starred threads need a reply.",
    ariaLabel: "Toggle inbox notifications",
  },
  {
    key: "weeklySummaryEmail",
    title: "Weekly summary email",
    description: "One calm note on Mondays — what’s up next.",
    ariaLabel: "Toggle weekly summary",
  },
];

function SoftCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(softCardClassName, className)}>
      <div className="mb-3.5">
        <h3
          className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
          style={frauncesStyle}
        >
          {title}
        </h3>
        <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-[rgba(42,38,34,0.1)] py-[11px] text-sm last:border-b-0">
      <span className="text-[#7a7166]">{label}</span>
      <span className="text-right font-semibold text-[#2a2622]">{value}</span>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-[#5c554c]">
        {label}
      </label>
      {children}
    </div>
  );
}

function EaseToggle({
  on,
  ariaLabel,
  disabled,
  onToggle,
}: {
  on: boolean;
  ariaLabel: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-[26px] w-11 shrink-0 rounded-full border transition-[background,border-color] duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        on
          ? "border-[#2f4a3c] bg-[#2f4a3c]"
          : "border-[rgba(42,38,34,0.1)] bg-[#ebe4d9]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-[#fffcf7] shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-transform duration-150",
          on && "translate-x-[18px]",
        )}
      />
    </button>
  );
}

export function SettingsEaseAccount({ data }: SettingsEaseAccountProps) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateAccountProfileAction,
    INITIAL_PROFILE_STATE,
  );
  const [eraseState, eraseAction, erasePending] = useActionState(
    eraseAccountAction,
    INITIAL_ERASE_STATE,
  );
  const [prefs, setPrefs] = useState(data.notificationPreferences);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsPending, startPrefsTransition] = useTransition();
  const [eraseConfirm, setEraseConfirm] = useState("");
  const canErase = eraseConfirm.trim() === ACCOUNT_ERASE_CONFIRMATION;

  useEffect(() => {
    setPrefs(data.notificationPreferences);
  }, [data.notificationPreferences]);

  function togglePref(key: NotificationKey) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsError(null);
    startPrefsTransition(async () => {
      const result = await saveAccountNotificationPreferencesAction(next);
      if (!result.success) {
        setPrefs(data.notificationPreferences);
        setPrefsError(result.error ?? "Could not save notification preferences.");
      }
    });
  }

  return (
    <section className="settings-ease-account" data-settings-ease="account">
      <div className="mb-[18px]">
        <h1
          className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
          style={frauncesStyle}
        >
          Account
        </h1>
        <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
          Your profile for this workspace, quiet notifications, and sign-out.
        </p>
      </div>

      {profileState.error ? (
        <p
          className="mb-3.5 rounded-[14px] border border-[rgba(166,90,58,0.22)] bg-[rgba(166,90,58,0.12)] px-4 py-3 text-sm font-semibold text-[#a65a3a]"
          role="alert"
        >
          {profileState.error}
        </p>
      ) : null}
      {profileState.success ? (
        <p
          className="mb-3.5 rounded-[14px] border border-[rgba(47,74,60,0.18)] bg-[rgba(47,74,60,0.08)] px-4 py-3 text-sm font-semibold text-[#2f4a3c]"
          role="status"
        >
          Profile saved.
        </p>
      ) : null}
      {prefsError ? (
        <p
          className="mb-3.5 rounded-[14px] border border-[rgba(166,90,58,0.22)] bg-[rgba(166,90,58,0.12)] px-4 py-3 text-sm font-semibold text-[#a65a3a]"
          role="alert"
        >
          {prefsError}
        </p>
      ) : null}
      {eraseState.error ? (
        <p
          className="mb-3.5 rounded-[14px] border border-[rgba(166,90,58,0.22)] bg-[rgba(166,90,58,0.12)] px-4 py-3 text-sm font-semibold text-[#a65a3a]"
          role="alert"
        >
          {eraseState.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <SoftCard
          title="Your profile"
          description="How you appear to teammates."
        >
          <form action={profileAction}>
            <Field id="acc-name" label="Display name">
              <input
                id="acc-name"
                name="displayName"
                type="text"
                required
                defaultValue={data.displayName}
                className={fieldControlClassName}
                autoComplete="name"
              />
            </Field>
            <Field id="acc-email" label="Email">
              <input
                id="acc-email"
                type="email"
                value={data.email}
                readOnly
                className={fieldControlClassName}
                autoComplete="email"
              />
            </Field>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={profilePending}
                className={btnPrimaryClassName}
              >
                {profilePending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </SoftCard>

        <SoftCard
          title="Notifications"
          description="Optional — keep these quiet if you only want in-app cues."
        >
          {NOTIFICATION_ROWS.map((row, index) => (
            <div
              key={row.key}
              className={cn(
                "flex items-center justify-between gap-4 py-3.5",
                index < NOTIFICATION_ROWS.length - 1 &&
                  "border-b border-[rgba(42,38,34,0.1)]",
              )}
            >
              <div>
                <h4 className="m-0 text-sm font-bold text-[#2a2622]">
                  {row.title}
                </h4>
                <p className="mt-[3px] mb-0 max-w-[40ch] text-xs text-[#5c554c]">
                  {row.description}
                </p>
              </div>
              <EaseToggle
                on={prefs[row.key]}
                ariaLabel={row.ariaLabel}
                disabled={prefsPending}
                onToggle={() => togglePref(row.key)}
              />
            </div>
          ))}
        </SoftCard>

        <SoftCard
          title="Session"
          description="Signed in on this device."
          className="lg:col-span-2"
        >
          <DetailRow label="Workspace" value={data.workspaceName} />
          <DetailRow label="Role" value={data.roleLabel} />
          <div className="mt-3.5">
            <SignOutForm>
              <button type="submit" className={btnDangerClassName}>
                Sign out
              </button>
            </SignOutForm>
          </div>
        </SoftCard>

        <SoftCard
          title="Delete / erase account"
          description="Permanently erase your Hey Ralli login and remove you from every workspace. Workspace content stays with each organization."
          className="lg:col-span-2 border-[rgba(166,90,58,0.22)]"
        >
          <p className="mb-3.5 text-[13px] leading-snug text-[#5c554c]">
            This cannot be undone. If you are the last admin on a workspace,
            transfer admin access in Team &amp; Access first.
          </p>
          <form action={eraseAction} data-settings-ease="account-erase">
            {data.eraseRequiresPassword ? (
              <Field id="acc-erase-password" label="Current password">
                <input
                  id="acc-erase-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className={fieldControlClassName}
                />
              </Field>
            ) : (
              <p className="mb-3.5 text-[13px] leading-snug text-[#5c554c]">
                Confirm with <strong className="text-[#2a2622]">DELETE</strong>{" "}
                below — your account uses social sign-in.
              </p>
            )}
            <Field
              id="acc-erase-confirm"
              label={`Type ${ACCOUNT_ERASE_CONFIRMATION} to confirm`}
            >
              <input
                id="acc-erase-confirm"
                name="confirmation"
                type="text"
                value={eraseConfirm}
                onChange={(event) => setEraseConfirm(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={ACCOUNT_ERASE_CONFIRMATION}
                className={fieldControlClassName}
              />
            </Field>
            <button
              type="submit"
              disabled={!canErase || erasePending}
              className={cn(btnDangerClassName, "disabled:cursor-not-allowed disabled:opacity-60")}
            >
              {erasePending ? "Erasing…" : "Erase my account"}
            </button>
          </form>
        </SoftCard>
      </div>
    </section>
  );
}
