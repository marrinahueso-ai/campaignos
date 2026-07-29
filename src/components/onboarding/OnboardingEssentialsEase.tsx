"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  continueFromOnboardingEssentialsAction,
  markOnboardingCalendarCompleteAction,
  saveOnboardingBrandAction,
  skipOnboardingEssentialsSectionAction,
} from "@/lib/onboarding/actions";
import { OnboardingEaseStepMeter } from "@/components/onboarding/OnboardingEaseStepMeter";
import { buildOAuthStartPath } from "@/lib/integrations/oauth";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { cn } from "@/lib/utils/cn";

type ImportMethod = "google" | "ics" | "upload";
type SectionKey = "cal" | "brand";
type SectionStatus = "active" | "skipped" | "done";

export interface OnboardingEssentialsEaseProps {
  organizationName: string;
  eventTitle: string;
  initialPrimary: string;
  initialSecondary: string;
  initialMascot: string;
  initialPtoLogo: string | null;
  initialSchoolLogo: string | null;
  calendarSettled: boolean;
  calendarCompleted: boolean;
  brandSettled: boolean;
  brandCompleted: boolean;
  googleConnected: boolean;
}

const ESSENTIALS_RETURN = "/onboarding/essentials";

const fieldClass =
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3 text-[15px] text-[#2a2622] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#7a7166]/70 focus:border-[rgba(47,74,60,0.45)] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.1)]";

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OR";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function LogoSlot({
  label,
  initials,
  previewUrl,
  inputId,
  name,
  variant,
  onFileChange,
}: {
  label: string;
  initials: string;
  previewUrl: string | null;
  inputId: string;
  name: string;
  variant: "pto" | "school";
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "rounded-[14px] border-[1.5px] border-dashed border-[rgba(42,38,34,0.14)] bg-[#f6f2eb] p-3.5 text-center transition-colors hover:border-[rgba(47,74,60,0.35)] hover:bg-[#fffcf7]",
      )}
    >
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={label}
          className="mx-auto mb-2 h-12 w-12 rounded-xl border border-[rgba(42,38,34,0.1)] bg-white object-contain p-1"
        />
      ) : (
        <div
          className={cn(
            "mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl font-bold text-[16px] text-[#f6f2eb]",
            variant === "pto" ? "bg-[#2f4a3c]" : "bg-[#2a7a86]",
          )}
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {initials}
        </div>
      )}
      <p className="m-0 text-xs font-semibold text-[#5c554c]">{label}</p>
    </button>
  );
}

/**
 * First-time setup page 2 — Calendar & brand (combined optional).
 * Exact Ease look from `public/onboarding-setup-ease-mockup.html?view=essentials`.
 */
export function OnboardingEssentialsEase({
  organizationName,
  eventTitle,
  initialPrimary,
  initialSecondary,
  initialMascot,
  initialPtoLogo,
  initialSchoolLogo,
  calendarSettled,
  calendarCompleted,
  brandSettled,
  brandCompleted,
  googleConnected,
}: OnboardingEssentialsEaseProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [importMethod, setImportMethod] = useState<ImportMethod>("google");
  const [calStatus, setCalStatus] = useState<SectionStatus>(() => {
    if (calendarCompleted || googleConnected) return "done";
    if (calendarSettled) return "skipped";
    return "active";
  });
  const [brandStatus, setBrandStatus] = useState<SectionStatus>(() => {
    if (brandCompleted) return "done";
    if (brandSettled) return "skipped";
    return "active";
  });
  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);
  const [mascot, setMascot] = useState(initialMascot);
  const [ptoPreview, setPtoPreview] = useState<string | null>(null);
  const [schoolPreview, setSchoolPreview] = useState<string | null>(null);
  const [ptoFile, setPtoFile] = useState<File | null>(null);
  const [schoolFile, setSchoolFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orgLabel = organizationName.trim() || "your school";
  const eventLabel = eventTitle.trim() || "your event";
  const initials = orgInitials(orgLabel);

  const displayPto =
    ptoPreview ??
    (initialPtoLogo
      ? (resolveAssetImageUrl(initialPtoLogo) ?? initialPtoLogo)
      : null);
  const displaySchool =
    schoolPreview ??
    (initialSchoolLogo
      ? (resolveAssetImageUrl(initialSchoolLogo) ?? initialSchoolLogo)
      : null);

  useEffect(() => {
    return () => {
      if (ptoPreview) URL.revokeObjectURL(ptoPreview);
    };
  }, [ptoPreview]);

  useEffect(() => {
    return () => {
      if (schoolPreview) URL.revokeObjectURL(schoolPreview);
    };
  }, [schoolPreview]);

  function setLogoFile(kind: "pto" | "school", file: File | null) {
    const nextUrl = file ? URL.createObjectURL(file) : null;
    if (kind === "pto") {
      if (ptoPreview) URL.revokeObjectURL(ptoPreview);
      setPtoPreview(nextUrl);
      setPtoFile(file);
    } else {
      if (schoolPreview) URL.revokeObjectURL(schoolPreview);
      setSchoolPreview(nextUrl);
      setSchoolFile(file);
    }
  }

  function handleSkipSection(key: SectionKey) {
    startTransition(async () => {
      setError(null);
      const step = key === "cal" ? "calendar" : "brand";
      const result = await skipOnboardingEssentialsSectionAction(step);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (key === "cal") setCalStatus("skipped");
      else setBrandStatus("skipped");
    });
  }

  function handleConnectCalendar() {
    startTransition(async () => {
      setError(null);
      const result = await markOnboardingCalendarCompleteAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setCalStatus("done");
      if (importMethod === "google") {
        window.location.href = buildOAuthStartPath("google", {
          returnTo: ESSENTIALS_RETURN,
        });
        return;
      }
      router.push("/calendar?tab=import");
    });
  }

  function handleSaveBrand() {
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.set("primaryColor", primaryColor);
      formData.set("secondaryColor", secondaryColor);
      formData.set("mascot", mascot);
      if (ptoFile) formData.set("ptoLogo", ptoFile);
      if (schoolFile) formData.set("schoolLogo", schoolFile);

      const result = await saveOnboardingBrandAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setBrandStatus("done");
      if (ptoPreview) {
        URL.revokeObjectURL(ptoPreview);
        setPtoPreview(null);
      }
      if (schoolPreview) {
        URL.revokeObjectURL(schoolPreview);
        setSchoolPreview(null);
      }
      setPtoFile(null);
      setSchoolFile(null);
      router.refresh();
    });
  }

  function handleAdvance() {
    startTransition(async () => {
      setError(null);
      const result = await continueFromOnboardingEssentialsAction();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "-mx-4 -my-8 min-h-[calc(100vh-4rem)] px-5 pb-16 pt-5",
        "lg:-mx-8 lg:-my-10 lg:px-5",
        "bg-[radial-gradient(ellipse_80%_50%_at_10%_-10%,rgba(107,129,113,0.14),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_0%,rgba(196,146,46,0.11),transparent_50%),radial-gradient(ellipse_50%_35%_at_50%_100%,rgba(42,122,134,0.07),transparent_55%),#f6f2eb]",
      )}
      data-onboarding-ease="essentials"
    >
      <div className="mx-auto mt-2 max-w-[760px]">
        <OnboardingEaseStepMeter step={2} className="max-w-none" />

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#6b8171]">
          Optional · about 2 minutes
        </p>
        <h1
          className="m-0 text-[clamp(28px,4vw,38px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Calendar & brand
        </h1>
        <p className="mt-2.5 max-w-[46ch] text-[15px] leading-normal text-[#5c554c]">
          Two helpful extras for {eventLabel} — skip either section, or skip the
          whole step.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-[22px] grid gap-3.5">
          {/* Calendar card */}
          <section className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h2
                  className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-[#2a2622]"
                  style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  Import calendar
                </h2>
                <p className="mt-1 max-w-[48ch] text-[13px] leading-snug text-[#5c554c]">
                  Pull in the year so dates don’t get missed. Same path as
                  Settings → Calendar import.
                </p>
              </div>
              {calStatus === "active" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSkipSection("cal")}
                  className="whitespace-nowrap border-none bg-transparent py-1.5 text-[13px] font-bold text-[#2a7a86] hover:text-[#2f4a3c] disabled:opacity-60"
                >
                  Skip calendar
                </button>
              ) : null}
            </div>

            {calStatus === "active" ? (
              <div>
                <div className="grid gap-2">
                  {(
                    [
                      {
                        id: "google" as const,
                        ico: "G",
                        title: "Google Calendar",
                        span: "Connect and choose calendars",
                      },
                      {
                        id: "ics" as const,
                        ico: "⇢",
                        title: "Subscribe link",
                        span: "Paste a calendar feed URL",
                      },
                      {
                        id: "upload" as const,
                        ico: "↑",
                        title: "Upload a file",
                        span: "Calendar export or spreadsheet",
                      },
                    ] as const
                  ).map((opt) => {
                    const selected = importMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setImportMethod(opt.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-3 text-left transition-[border-color,background,box-shadow]",
                          selected
                            ? "border-[#2f4a3c] bg-[#fffcf7] shadow-[0_0_0_3px_rgba(47,74,60,0.08)]"
                            : "border-transparent bg-[#f6f2eb] hover:border-[rgba(47,74,60,0.25)] hover:bg-[#fffcf7]",
                        )}
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#ebe4d9] text-[15px] font-bold text-[#2f4a3c]">
                          {opt.ico}
                        </div>
                        <div>
                          <strong className="block text-[13px] font-bold text-[#2a2622]">
                            {opt.title}
                          </strong>
                          <span className="text-xs text-[#7a7166]">
                            {opt.span}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleConnectCalendar}
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-4 py-2.5 text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px disabled:opacity-60"
                  >
                    {isPending ? "Connecting…" : "Connect calendar"}
                  </button>
                </div>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]">
                {calStatus === "done"
                  ? "Calendar connected"
                  : "Calendar skipped — you can add it later"}
              </span>
            )}
          </section>

          {/* Brand card */}
          <section className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h2
                  className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-[#2a2622]"
                  style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  Brand basics
                </h2>
                <p className="mt-1 max-w-[48ch] text-[13px] leading-snug text-[#5c554c]">
                  Logos and colors so every campaign feels like {orgLabel}.
                </p>
              </div>
              {brandStatus === "active" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSkipSection("brand")}
                  className="whitespace-nowrap border-none bg-transparent py-1.5 text-[13px] font-bold text-[#2a7a86] hover:text-[#2f4a3c] disabled:opacity-60"
                >
                  Skip brand
                </button>
              ) : null}
            </div>

            {brandStatus === "active" ? (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <LogoSlot
                    label="PTO logo"
                    initials={initials}
                    previewUrl={displayPto}
                    inputId="essentials-pto-logo"
                    name="ptoLogo"
                    variant="pto"
                    onFileChange={(file) => setLogoFile("pto", file)}
                  />
                  <LogoSlot
                    label="School logo"
                    initials={initials}
                    previewUrl={displaySchool}
                    inputId="essentials-school-logo"
                    name="schoolLogo"
                    variant="school"
                    onFileChange={(file) => setLogoFile("school", file)}
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <label className="flex-1 cursor-pointer rounded-xl border border-[rgba(42,38,34,0.1)] bg-[#f6f2eb] p-2.5">
                    <span
                      className="mb-1.5 block h-7 rounded-lg"
                      style={{ background: primaryColor }}
                    />
                    <span className="text-[11px] font-semibold text-[#5c554c]">
                      Primary
                    </span>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(event) => setPrimaryColor(event.target.value)}
                      className="sr-only"
                      aria-label="Primary color"
                    />
                  </label>
                  <label className="flex-1 cursor-pointer rounded-xl border border-[rgba(42,38,34,0.1)] bg-[#f6f2eb] p-2.5">
                    <span
                      className="mb-1.5 block h-7 rounded-lg"
                      style={{ background: secondaryColor }}
                    />
                    <span className="text-[11px] font-semibold text-[#5c554c]">
                      Accent
                    </span>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(event) =>
                        setSecondaryColor(event.target.value)
                      }
                      className="sr-only"
                      aria-label="Accent color"
                    />
                  </label>
                  <div className="flex-1 rounded-xl border border-[rgba(42,38,34,0.1)] bg-[#f6f2eb] p-2.5">
                    <span className="mb-1.5 block h-7 rounded-lg bg-[#2a7a86]" />
                    <span className="text-[11px] font-semibold text-[#5c554c]">
                      Support
                    </span>
                  </div>
                </div>

                <div className="mt-3 max-w-[240px]">
                  <label
                    htmlFor="essentials-mascot"
                    className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
                  >
                    Mascot{" "}
                    <span className="font-medium text-[#7a7166]">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="essentials-mascot"
                    type="text"
                    value={mascot}
                    onChange={(event) => setMascot(event.target.value)}
                    placeholder="Riverhawks"
                    className={fieldClass}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveBrand}
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-4 py-2.5 text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px disabled:opacity-60"
                  >
                    {isPending ? "Saving…" : "Save brand kit"}
                  </button>
                </div>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]">
                {brandStatus === "done"
                  ? "Brand kit saved"
                  : "Brand skipped — you can add it later"}
              </span>
            )}
          </section>
        </div>

        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={handleAdvance}
            className="inline-flex items-center justify-center rounded-full px-3.5 py-2.5 text-sm font-bold text-[#5c554c] transition-colors hover:text-[#2a2622] disabled:opacity-60"
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleAdvance}
            className="inline-flex items-center justify-center rounded-full bg-[#2a2622] px-5 py-3 text-sm font-bold text-[#fffcf7] transition-transform hover:-translate-y-px disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
