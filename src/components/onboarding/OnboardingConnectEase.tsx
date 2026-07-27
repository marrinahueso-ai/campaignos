"use client";

import { useState, useTransition } from "react";
import {
  continueFromOnboardingConnectAction,
  markOnboardingMetaCompleteAction,
  sendOnboardingConnectInviteAction,
  skipOnboardingConnectSectionAction,
} from "@/lib/onboarding/actions";
import { OnboardingEaseStepMeter } from "@/components/onboarding/OnboardingEaseStepMeter";
import { buildOAuthStartPath } from "@/lib/integrations/oauth";
import { cn } from "@/lib/utils/cn";

type SectionKey = "team" | "meta";
type SectionStatus = "active" | "skipped" | "done";

export interface OnboardingConnectEaseProps {
  organizationName: string;
  eventTitle: string;
  inviteSettled: boolean;
  inviteCompleted: boolean;
  metaSettled: boolean;
  metaCompleted: boolean;
  metaConnected: boolean;
  facebookPageName: string | null;
  instagramConnected: boolean;
  oauthError?: string | null;
}

const CONNECT_RETURN = "/onboarding/connect";

const fieldClass =
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3 text-[15px] text-[#2a2622] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#7a7166]/70 focus:border-[rgba(47,74,60,0.45)] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.1)]";

/**
 * First-time setup page 3 — Team & Meta (combined optional).
 * Exact Ease look from `public/onboarding-setup-ease-mockup.html?view=connect`.
 */
export function OnboardingConnectEase({
  organizationName,
  eventTitle,
  inviteSettled,
  inviteCompleted,
  metaSettled,
  metaCompleted,
  metaConnected,
  facebookPageName,
  instagramConnected,
  oauthError = null,
}: OnboardingConnectEaseProps) {
  const [isPending, startTransition] = useTransition();
  const [teamStatus, setTeamStatus] = useState<SectionStatus>(() => {
    if (inviteCompleted) return "done";
    if (inviteSettled) return "skipped";
    return "active";
  });
  const [metaStatus, setMetaStatus] = useState<SectionStatus>(() => {
    if (metaConnected || metaCompleted) return "done";
    if (metaSettled) return "skipped";
    return "active";
  });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteDoneLabel, setInviteDoneLabel] = useState<string | null>(
    inviteCompleted ? "Invite sent" : null,
  );
  const [error, setError] = useState<string | null>(oauthError);

  const orgLabel = organizationName.trim() || "your school";
  const eventLabel = eventTitle.trim() || "your event";
  const pageLabel = facebookPageName?.trim() || orgLabel;

  function handleSkipSection(key: SectionKey) {
    startTransition(async () => {
      setError(null);
      const step = key === "team" ? "invite" : "meta";
      const result = await skipOnboardingConnectSectionAction(step);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (key === "team") {
        setTeamStatus("skipped");
        setInviteDoneLabel(null);
      } else {
        setMetaStatus("skipped");
      }
    });
  }

  function handleSendInvite() {
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("email", email);
      const result = await sendOnboardingConnectInviteAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      const name = fullName.trim() || email.trim() || "teammate";
      setInviteDoneLabel(`Invite sent to ${name}`);
      setTeamStatus("done");
    });
  }

  function handleConnectMeta() {
    startTransition(async () => {
      setError(null);
      const result = await markOnboardingMetaCompleteAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMetaStatus("done");
      window.location.href = buildOAuthStartPath("meta", {
        returnTo: CONNECT_RETURN,
      });
    });
  }

  function handleAdvance() {
    startTransition(async () => {
      setError(null);
      const result = await continueFromOnboardingConnectAction();
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
      data-onboarding-ease="connect"
    >
      <div className="mx-auto mt-2 max-w-[760px]">
        <OnboardingEaseStepMeter step={3} className="max-w-none" />

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#6b8171]">
          Optional · last setup step
        </p>
        <h1
          className="m-0 text-[clamp(28px,4vw,38px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Team & Meta
        </h1>
        <p className="mt-2.5 max-w-[46ch] text-[15px] leading-normal text-[#5c554c]">
          Invite help and connect publishing — or skip straight to {eventLabel}.
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
          {/* Team card */}
          <section className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h2
                  className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-[#2a2622]"
                  style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  Invite a teammate
                </h2>
                <p className="mt-1 max-w-[48ch] text-[13px] leading-snug text-[#5c554c]">
                  Add a co-chair or communications lead. You can do this later
                  from Team & Access.
                </p>
              </div>
              {teamStatus === "active" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSkipSection("team")}
                  className="whitespace-nowrap border-none bg-transparent py-1.5 text-[13px] font-bold text-[#2a7a86] hover:text-[#2f4a3c] disabled:opacity-60"
                >
                  Skip invite
                </button>
              ) : null}
            </div>

            {teamStatus === "active" ? (
              <div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="connect-fullName"
                      className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
                    >
                      Name
                    </label>
                    <input
                      id="connect-fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Jamie Rivera"
                      className={fieldClass}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="connect-email"
                      className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
                    >
                      Email
                    </label>
                    <input
                      id="connect-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="jamie@schoolpto.org"
                      className={fieldClass}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending || !email.trim()}
                    onClick={handleSendInvite}
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-4 py-2.5 text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px disabled:opacity-60"
                  >
                    {isPending ? "Sending…" : "Send invite"}
                  </button>
                </div>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]">
                {teamStatus === "done"
                  ? (inviteDoneLabel ?? "Invite sent")
                  : "Invite skipped — you can invite later"}
              </span>
            )}
          </section>

          {/* Meta card */}
          <section className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h2
                  className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-[#2a2622]"
                  style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
                >
                  Connect Facebook & Instagram
                </h2>
                <p className="mt-1 max-w-[48ch] text-[13px] leading-snug text-[#5c554c]">
                  Link the PTA page so approved posts can publish automatically.
                </p>
              </div>
              {metaStatus === "active" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSkipSection("meta")}
                  className="whitespace-nowrap border-none bg-transparent py-1.5 text-[13px] font-bold text-[#2a7a86] hover:text-[#2f4a3c] disabled:opacity-60"
                >
                  Skip Meta
                </button>
              ) : null}
            </div>

            {metaStatus === "active" ? (
              <div>
                <div className="grid gap-2">
                  <div className="flex items-center gap-3 rounded-[14px] border border-transparent bg-[#f6f2eb] px-3.5 py-3">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white"
                      style={{ background: "#1877f2" }}
                      aria-hidden
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H6v4h3v8h4v-8h3l1-4h-4V9c0-.6.4-1 1-1z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-[13px] font-bold text-[#2a2622]">
                        Facebook Page
                      </strong>
                      <span className="text-xs text-[#7a7166]">{pageLabel}</span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#c4922e]">
                      {metaConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-[14px] border border-transparent bg-[#f6f2eb] px-3.5 py-3">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-white"
                      style={{
                        background:
                          "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                      }}
                      aria-hidden
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle
                          cx="17.5"
                          cy="6.5"
                          r="1"
                          fill="currentColor"
                          stroke="none"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-[13px] font-bold text-[#2a2622]">
                        Instagram
                      </strong>
                      <span className="text-xs text-[#7a7166]">
                        Linked when your Page has an IG account
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#c4922e]">
                      {instagramConnected
                        ? "Connected"
                        : metaConnected
                          ? "Waiting"
                          : "Waiting"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleConnectMeta}
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-4 py-2.5 text-[13px] font-bold text-[#2a2622] transition-transform hover:-translate-y-px disabled:opacity-60"
                  >
                    {isPending ? "Connecting…" : "Connect with Meta"}
                  </button>
                </div>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]">
                {metaStatus === "done"
                  ? "Meta connected"
                  : "Meta skipped — connect anytime from Settings"}
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
            Go to {eventLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
