"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useActionState, useEffect, useState } from "react";
import {
  updateOrganizationProfileAction,
  type OrganizationProfileFormState,
} from "@/lib/organizations/profile-actions";
import {
  savePostingPreferencesAction,
  type PostingPreferencesActionState,
} from "@/lib/organizations/posting-preferences-actions";
import {
  COMMON_US_TIMEZONES,
  type PostingPreferencesInput,
} from "@/types/posting-preferences";
import type { BrandAssets, Organization } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const DAY_OPTIONS = DAY_LABELS.map((label, value) => ({ value, label }));

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: formatHour(hour),
}));

const INITIAL_PROFILE_STATE: OrganizationProfileFormState = {
  error: null,
  success: false,
};

const INITIAL_POSTING_STATE: PostingPreferencesActionState = {
  error: null,
  success: false,
};

interface SettingsEaseOrganizationProps {
  organization: Organization;
  brandAssets: BrandAssets | null;
  postingInput: PostingPreferencesInput | null;
}

function SoftCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
      <div className="mb-3.5">
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

const fieldControlClassName =
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-3.5 py-[11px] text-sm text-[#2a2622] outline-none transition-[border-color,background,box-shadow] duration-100 focus:border-[rgba(47,74,60,0.35)] focus:bg-[#fffcf7] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.08)]";

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px";

function formatHour(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPreferredDays(input: PostingPreferencesInput | null): string {
  if (!input?.useCustomWindows) {
    return "Mon · Tue · Wed · Thu · Fri";
  }
  const days = [...input.daysOfWeek].sort((a, b) => a - b);
  if (days.length === 0) return "—";
  return days.map((day) => DAY_LABELS[day] ?? "?").join(" · ");
}

function formatPreferredTime(input: PostingPreferencesInput | null): string {
  if (!input?.useCustomWindows) {
    return "5–8 PM local";
  }
  return `${formatHour(input.startHour)} local`;
}

export function SettingsEaseOrganization({
  organization,
  brandAssets,
  postingInput,
}: SettingsEaseOrganizationProps) {
  const router = useRouter();
  const [profileState, profileAction, profilePending] = useActionState(
    updateOrganizationProfileAction,
    INITIAL_PROFILE_STATE,
  );
  const [postingState, postingAction, postingPending] = useActionState(
    savePostingPreferencesAction,
    INITIAL_POSTING_STATE,
  );
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [useCustomWindows, setUseCustomWindows] = useState(
    postingInput?.useCustomWindows ?? false,
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    postingInput?.daysOfWeek ?? [1, 2, 3, 4, 5],
  );

  useEffect(() => {
    if (!postingState.success) return;
    setEditingSchedule(false);
    router.refresh();
  }, [postingState.success, router]);

  const website =
    organization.ptoWebsite?.trim() ||
    organization.schoolWebsite?.trim() ||
    "";

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
  }

  function handlePostingSubmit(event: FormEvent<HTMLFormElement>) {
    if (useCustomWindows && selectedDays.length === 0) {
      event.preventDefault();
    }
  }

  return (
    <section
      className="settings-ease-organization"
      data-settings-ease="organization"
    >
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Organization
          </h1>
          <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
            School profile and workspace preferences. Voice, logos, and year live
            under Branding.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings/branding?section=colors-logos"
            className={btnSecondaryClassName}
          >
            Open Branding
          </Link>
          <button
            type="submit"
            form="settings-ease-org-profile"
            disabled={profilePending}
            className={btnPrimaryClassName}
          >
            {profilePending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {profileState.error ? (
        <p
          className="mb-3.5 rounded-[14px] border border-[rgba(166,90,58,0.22)] bg-[rgba(166,90,58,0.12)] px-4 py-3 text-sm font-semibold text-[#a65a3a]"
          role="alert"
        >
          {profileState.error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <form id="settings-ease-org-profile" action={profileAction}>
          <input
            type="hidden"
            name="district"
            value={organization.district ?? ""}
          />
          <input
            type="hidden"
            name="schoolYear"
            value={organization.schoolYear ?? ""}
          />
          <input
            type="hidden"
            name="principal"
            value={organization.principal ?? ""}
          />
          <input type="hidden" name="mascot" value={organization.mascot ?? ""} />
          <input
            type="hidden"
            name="schoolWebsite"
            value={organization.schoolWebsite ?? ""}
          />

          <SoftCard
            title="Profile"
            description="Shown across Hey Ralli for this workspace."
          >
            <Field id="org-name" label="Organization name">
              <input
                id="org-name"
                name="name"
                type="text"
                required
                defaultValue={organization.name}
                className={fieldControlClassName}
                autoComplete="organization"
              />
            </Field>
            <Field id="org-street" label="Street address">
              <input
                id="org-street"
                name="addressLine1"
                type="text"
                defaultValue={organization.addressLine1 ?? ""}
                className={fieldControlClassName}
                autoComplete="address-line1"
              />
            </Field>
            <Field id="org-street-2" label="Apartment, suite, etc.">
              <input
                id="org-street-2"
                name="addressLine2"
                type="text"
                defaultValue={organization.addressLine2 ?? ""}
                className={fieldControlClassName}
                autoComplete="address-line2"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="org-addr-city" label="City">
                <input
                  id="org-addr-city"
                  name="city"
                  type="text"
                  defaultValue={organization.city ?? ""}
                  className={fieldControlClassName}
                  autoComplete="address-level2"
                />
              </Field>
              <Field id="org-addr-state" label="State">
                <input
                  id="org-addr-state"
                  name="state"
                  type="text"
                  defaultValue={organization.state ?? ""}
                  className={fieldControlClassName}
                  autoComplete="address-level1"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="org-postal" label="Postal / ZIP">
                <input
                  id="org-postal"
                  name="postalCode"
                  type="text"
                  defaultValue={organization.postalCode ?? ""}
                  className={fieldControlClassName}
                  autoComplete="postal-code"
                />
              </Field>
              <Field id="org-country" label="Country">
                <input
                  id="org-country"
                  name="country"
                  type="text"
                  defaultValue={organization.country ?? ""}
                  className={fieldControlClassName}
                  autoComplete="country-name"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field id="org-tz" label="Timezone">
                <select
                  id="org-tz"
                  name="timezone"
                  required
                  defaultValue={organization.timezone || "America/Chicago"}
                  className={fieldControlClassName}
                >
                  {COMMON_US_TIMEZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="org-type" label="Type">
                <input
                  id="org-type"
                  type="text"
                  value="PTO"
                  readOnly
                  className={fieldControlClassName}
                />
              </Field>
            </div>
            <Field id="org-web" label="Website">
              <input
                id="org-web"
                name="ptoWebsite"
                type="url"
                defaultValue={website}
                className={fieldControlClassName}
              />
            </Field>
            <p className="mb-2 mt-1 text-xs font-bold text-[#5c554c]">
              Weather location
            </p>
            <p className="mb-3 text-[12px] leading-snug text-[#7a7166]">
              Used for live weather on the Dashboard. ZIP is preferred.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field id="org-weather-city" label="Weather city">
                <input
                  id="org-weather-city"
                  name="weatherCity"
                  type="text"
                  defaultValue={organization.weatherCity ?? ""}
                  className={fieldControlClassName}
                />
              </Field>
              <Field id="org-weather-state" label="Weather state">
                <input
                  id="org-weather-state"
                  name="weatherState"
                  type="text"
                  defaultValue={organization.weatherState ?? ""}
                  className={fieldControlClassName}
                />
              </Field>
              <Field id="org-weather-zip" label="Weather ZIP">
                <input
                  id="org-weather-zip"
                  name="weatherZip"
                  type="text"
                  defaultValue={organization.weatherZip ?? ""}
                  className={fieldControlClassName}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              </Field>
            </div>
          </SoftCard>
        </form>

        <SoftCard
          title="Preferences"
          description="Language and school details."
        >
          <DetailRow label="Language">English (US)</DetailRow>
          <DetailRow label="Principal">
            {organization.principal?.trim() || "—"}
          </DetailRow>
          <DetailRow label="Mascot">
            {organization.mascot?.trim() || "—"}
          </DetailRow>
          <DetailRow label="Active school year">
            {organization.schoolYear?.trim()
              ? `${organization.schoolYear.trim()} · managed in Branding`
              : "Managed in Branding"}
          </DetailRow>
        </SoftCard>

        <SoftCard
          title="Branding home"
          description="Colors, logos, AI voice, inbox sources, playbooks, and school year moved here."
        >
          <DetailRow label="Brand kit">
            {brandAssets?.primaryColor || brandAssets?.ptoLogo || brandAssets?.schoolLogo
              ? "Primary · accent · logos"
              : "Open Branding to set kit"}
          </DetailRow>
          <DetailRow label="AI Brain">Org voice · writing style</DetailRow>
          <DetailRow label="Inbox AI">Reply sources · FAQ pages</DetailRow>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Link href="/settings/branding" className={btnSecondaryClassName}>
              Open Branding
            </Link>
          </div>
        </SoftCard>

        <SoftCard
          title="Posting preferences"
          description="Default windows for Meta publishing."
        >
          {editingSchedule && postingInput ? (
            <form
              action={postingAction}
              onSubmit={handlePostingSubmit}
              data-settings-ease="posting-editor"
            >
              <input
                type="hidden"
                name="timezone"
                value={postingInput.timezone}
              />

              <label className="mb-3.5 flex items-start gap-3 rounded-[14px] border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-4 py-3">
                <input
                  type="checkbox"
                  name="useCustomWindows"
                  value="on"
                  checked={useCustomWindows}
                  onChange={(event) =>
                    setUseCustomWindows(event.target.checked)
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#2a2622]">
                    Set custom best times to post
                  </span>
                  <span className="mt-1 block text-[13px] text-[#5c554c]">
                    When off, Hey Ralli suggests weekday evenings (5–8pm) for
                    PTO audiences.
                  </span>
                </span>
              </label>

              {useCustomWindows ? (
                <div className="mb-3.5 space-y-3.5">
                  <fieldset>
                    <legend className="text-xs font-bold text-[#5c554c]">
                      Preferred days
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DAY_OPTIONS.map(({ value, label }) => {
                        const active = selectedDays.includes(value);
                        return (
                          <label
                            key={value}
                            className={
                              active
                                ? "inline-flex cursor-pointer items-center rounded-full bg-[#2a2622] px-3 py-1.5 text-xs font-bold text-[#fffcf7]"
                                : "inline-flex cursor-pointer items-center rounded-full border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-3 py-1.5 text-xs font-bold text-[#5c554c]"
                            }
                          >
                            <input
                              type="checkbox"
                              name="daysOfWeek"
                              value={value}
                              checked={active}
                              onChange={() => toggleDay(value)}
                              className="sr-only"
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field id="post-start" label="Start hour">
                      <select
                        id="post-start"
                        name="startHour"
                        defaultValue={String(postingInput.startHour)}
                        className={fieldControlClassName}
                      >
                        {HOUR_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field id="post-end" label="End hour">
                      <select
                        id="post-end"
                        name="endHour"
                        defaultValue={String(postingInput.endHour)}
                        className={fieldControlClassName}
                      >
                        {HOUR_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ) : null}

              {postingState.error ? (
                <p
                  className="mb-3 text-sm font-semibold text-[#a65a3a]"
                  role="alert"
                >
                  {postingState.error}
                </p>
              ) : null}
              {postingState.success ? (
                <p className="mb-3 text-sm font-semibold text-[#2f4a3c]">
                  Posting preferences saved.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={postingPending}
                  className={btnPrimaryClassName}
                >
                  {postingPending ? "Saving…" : "Save schedule"}
                </button>
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={() => setEditingSchedule(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <DetailRow label="Preferred days">
                {formatPreferredDays(postingInput)}
              </DetailRow>
              <DetailRow label="Preferred time">
                {formatPreferredTime(postingInput)}
              </DetailRow>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={() => setEditingSchedule(true)}
                  disabled={!postingInput}
                >
                  Edit schedule
                </button>
              </div>
            </>
          )}
        </SoftCard>
      </div>
    </section>
  );
}
