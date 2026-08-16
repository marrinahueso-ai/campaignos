"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buildMetaOAuthStartPath } from "@/lib/integrations/oauth";
import { disconnectMetaConnectionAction } from "@/lib/meta-publishing/connection-actions";
import {
  getMetaCapabilityStatusLabels,
  getMetaConnectUiPhase,
} from "@/lib/meta-publishing/connection-utils";
import type { MetaSettingsConnectionView } from "@/lib/meta-publishing/types";

/** Meta Business help: link Instagram Professional to a Facebook Page. */
const META_LINK_INSTAGRAM_HELP_URL =
  "https://www.facebook.com/business/help/898752960195806";

interface SettingsEaseMetaProps {
  organizationName: string | null;
  /** Token-free connection summary — never include decrypted Page tokens. */
  connection: MetaSettingsConnectionView | null;
  integrationConfigured: boolean;
  reconnectRequired: boolean;
  /** From inbox connection status — Page picture CDN URL when available. */
  pagePictureUrl: string | null;
  /** Instagram Professional username without @ — null if Graph did not return it. */
  instagramUsername: string | null;
  /** Instagram Professional profile picture URL when available. */
  instagramPictureUrl: string | null;
  /** Real inbox scope readiness — not OAuth completion alone. */
  messagingReady: boolean;
  returnTo: string;
  statusMessage: string | null;
  statusHint: string | null;
  statusTone: "success" | "error" | null;
  pagesHint: string | null;
}

const btnPrimaryClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl border-none bg-[#2f4a3c] px-8 py-3.5 text-base font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

const btnSecondaryClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[rgba(42,38,34,0.12)] bg-[#fffcf7] px-8 py-3.5 text-base font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

const btnGhostClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-none bg-transparent px-[18px] py-[11px] text-[13px] font-bold text-[#7a7166] transition-colors duration-100 hover:text-[#2a2622] disabled:cursor-not-allowed disabled:opacity-60";

const btnChangeClassName =
  "inline-flex shrink-0 items-center justify-center rounded-xl border border-[rgba(42,38,34,0.12)] bg-[#fffcf7] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#5c554c] transition-colors hover:bg-[rgba(246,242,235,0.9)] hover:text-[#2a2622]";

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "off" | "warn";
  children: React.ReactNode;
}) {
  const className =
    tone === "ok"
      ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]"
      : tone === "warn"
        ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(196,146,46,0.16)] px-2.5 py-1 text-xs font-bold text-[#7a5a12]"
        : "inline-flex items-center gap-1.5 rounded-full bg-[rgba(122,113,102,0.12)] px-2.5 py-1 text-xs font-bold text-[#7a7166]";

  return (
    <span className={className}>
      {tone === "ok" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

function ProgressSteps({
  phase,
}: {
  phase: ReturnType<typeof getMetaConnectUiPhase>;
}) {
  const step1Done =
    phase === "facebook_only" ||
    phase === "fully_connected" ||
    phase === "reconnect_required";
  const step2Done = step1Done;
  const step3Done = phase === "fully_connected";
  const step3Active = phase === "facebook_only";

  const steps = [
    {
      key: "fb",
      label: step1Done ? "Facebook connected" : "Connect Facebook",
      done: step1Done,
      active: phase === "not_connected" || phase === "reconnect_required",
    },
    {
      key: "page",
      label: step2Done ? "Page chosen" : "Choose Page",
      done: step2Done,
      active: false,
    },
    {
      key: "ig",
      label: step3Done ? "Instagram connected" : "Connect Instagram",
      done: step3Done,
      active: step3Active,
    },
  ] as const;

  return (
    <div className="relative mb-10 mt-2 px-1 sm:mb-12 sm:px-4" aria-label="Connection steps">
      <div
        className="absolute left-0 right-0 top-4 h-px -translate-y-1/2 bg-[rgba(42,38,34,0.12)] sm:top-4"
        aria-hidden
      />
      <ol className="relative z-[1] m-0 flex list-none items-start justify-between gap-2 p-0">
        {steps.map((step, index) => {
          const circleClass = step.done
            ? "bg-[#2f4a3c] text-[#fffcf7]"
            : step.active
              ? "bg-[#2f4a3c] text-[#fffcf7]"
              : "border border-[rgba(42,38,34,0.15)] bg-[#fffcf7] text-[#7a7166]";
          const labelClass =
            step.done || step.active
              ? "text-[#2f4a3c]"
              : "text-[#7a7166]";
          return (
            <li
              key={step.key}
              className="flex max-w-[30%] flex-col items-center text-center"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${circleClass}`}
                aria-current={step.active ? "step" : undefined}
              >
                {step.done ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    aria-hidden
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`mt-2 text-[10px] font-bold uppercase tracking-wider sm:text-[11px] ${labelClass}`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PageAvatar({
  pageName,
  pagePictureUrl,
}: {
  pageName: string;
  pagePictureUrl: string | null;
}) {
  const initial = pageName.trim().charAt(0).toUpperCase() || "P";
  return (
    <div className="relative shrink-0">
      {pagePictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Meta CDN avatar; AppImage not required here
        <img
          src={pagePictureUrl}
          alt=""
          className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
        />
      ) : (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[rgba(47,74,60,0.12)] text-sm font-bold text-[#2f4a3c] shadow-sm"
          aria-hidden
        >
          {initial}
        </span>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1877F2] text-[10px] font-bold text-white"
        aria-hidden
      >
        f
      </span>
    </div>
  );
}

function InstagramAvatar({
  username,
  pictureUrl,
}: {
  username: string | null;
  pictureUrl: string | null;
}) {
  const initial = (username?.trim().charAt(0) || "I").toUpperCase();
  return (
    <div className="relative shrink-0">
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Meta CDN avatar
        <img
          src={pictureUrl}
          alt=""
          className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
        />
      ) : (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[rgba(193,53,132,0.12)] text-sm font-bold text-[#c13584] shadow-sm"
          aria-hidden
        >
          {initial}
        </span>
      )}
      <span
        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#c13584] text-[9px] font-bold text-white"
        aria-hidden
      >
        IG
      </span>
    </div>
  );
}

function CapabilityRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-[#2f4a3c]" : "bg-[rgba(42,38,34,0.2)]"}`}
          aria-hidden
        />
        <span className="text-sm text-[#5c554c]">{label}</span>
      </div>
      <div
        className={`text-right text-sm font-bold ${ok ? "text-[#2f4a3c]" : "text-[#7a7166]"}`}
      >
        {value}
      </div>
    </>
  );
}

function BeforeYouStart() {
  return (
    <div className="rounded-3xl border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-6 py-5">
      <h3 className="m-0 mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#7a7166]">
        Before you start
      </h3>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {[
          "Access to your organization’s Facebook Page",
          "Permission to manage the Page",
          "Instagram Professional account linked to that Facebook Page, if you use Instagram",
        ].map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 text-sm leading-snug text-[#5c554c]"
          >
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#2f4a3c]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsEaseMeta({
  organizationName,
  connection,
  integrationConfigured,
  reconnectRequired,
  pagePictureUrl,
  instagramUsername,
  instagramPictureUrl,
  messagingReady,
  returnTo,
  statusMessage,
  statusHint,
  statusTone,
  pagesHint,
}: SettingsEaseMetaProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [manageOpen, setManageOpen] = useState(false);

  const connected = Boolean(connection?.connected);
  const hasInstagram = Boolean(connection?.hasInstagram);
  const configuredViaEnv = Boolean(connection?.configuredViaEnv);
  const orgLabel = organizationName ?? "your organization";
  const pageLabel = connection?.pageName?.trim() || "Facebook Page";

  const phase = getMetaConnectUiPhase({
    connected,
    hasInstagram,
    reconnectRequired,
  });
  const capabilities = getMetaCapabilityStatusLabels({
    connected,
    hasInstagram,
    reconnectRequired,
    messagingReady,
  });

  const connectHref = buildMetaOAuthStartPath({
    returnTo,
    pageId: connected ? connection?.facebookPageId : undefined,
    authType: connected || reconnectRequired ? "rerequest" : undefined,
  });

  const doneHref =
    returnTo && returnTo !== "/settings/meta" ? returnTo : "/communications";

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await disconnectMetaConnectionAction();
      if (!result.success) {
        setError(result.error ?? "Could not disconnect.");
        return;
      }
      setMessage("Meta disconnected.");
      setManageOpen(false);
      router.refresh();
    });
  }

  const statusTonePill: "ok" | "off" | "warn" = reconnectRequired
    ? "warn"
    : connected
      ? "ok"
      : "off";
  const statusLabel = reconnectRequired
    ? "Reconnect needed"
    : connected
      ? hasInstagram
        ? "Connected"
        : "Facebook connected"
      : "Not connected";

  const oauthDisabled = isPending || !(integrationConfigured || configuredViaEnv);

  return (
    <section data-settings-ease="meta" className="mx-auto max-w-xl">
      <Link
        href="/settings/integrations"
        className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#5c554c] transition-colors hover:text-[#2a2622]"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="M15 18 9 12l6-6" />
        </svg>
        Integrations
      </Link>

      <div className="mb-6 text-center sm:mb-8">
        <div className="mb-3 flex justify-center">
          <StatusPill tone={statusTonePill}>{statusLabel}</StatusPill>
        </div>
        <h1
          className="m-0 text-[clamp(28px,4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {phase === "fully_connected"
            ? "You’re connected"
            : "Connect Facebook & Instagram"}
        </h1>
        <p className="mx-auto mt-3 mb-0 max-w-[42ch] text-base leading-relaxed text-[#5c554c]">
          {phase === "fully_connected"
            ? `Hey Ralli can help ${orgLabel} publish and manage Facebook and Instagram communications.`
            : phase === "facebook_only"
              ? "Facebook is connected. Link Instagram to this Page in Meta when you’re ready — Hey Ralli will pick it up after you reconnect or refresh."
              : phase === "reconnect_required"
                ? "Facebook needs you to sign in again to restore publishing, inbox, and Insights."
                : `Connect ${orgLabel}’s Facebook Page and linked Instagram so Hey Ralli can publish, schedule, and manage communications.`}
        </p>
      </div>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "mb-4 text-center text-sm text-emerald-700"
              : "mb-4 text-center text-sm text-red-600"
          }
          role="status"
        >
          {statusMessage}
          {statusHint ? (
            <span className="mt-1 block text-[#5c554c]">{statusHint}</span>
          ) : null}
          {pagesHint ? (
            <span className="mt-1 block text-[#5c554c]">
              Facebook signed you in, but no usable Page was available for this
              organization. Confirm you admin a Facebook Page, then try Connect
              again. If this keeps happening, contact support.
            </span>
          ) : null}
        </p>
      ) : null}

      {phase !== "fully_connected" ? <ProgressSteps phase={phase} /> : null}

      {/* —— State 1: not connected —— */}
      {phase === "not_connected" || phase === "reconnect_required" ? (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-7 py-8 text-center shadow-[0_8px_28px_rgba(28,36,48,0.05)]">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(24,119,242,0.1)] text-2xl font-bold text-[#1877F2]"
              aria-hidden
            >
              f
            </div>
            <h2
              className="m-0 text-2xl font-semibold tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Facebook
            </h2>
            <p className="mx-auto mt-2 mb-6 max-w-[36ch] text-sm leading-relaxed text-[#5c554c]">
              {phase === "reconnect_required"
                ? "Sign in again with Facebook to restore this organization’s connection."
                : "Connect your organization’s Facebook Page. You’ll choose the Page securely with Facebook."}
            </p>
            {integrationConfigured || configuredViaEnv ? (
              <a
                href={connectHref}
                className={`${btnPrimaryClassName} ${oauthDisabled ? "pointer-events-none opacity-60" : ""}`}
                aria-disabled={oauthDisabled}
              >
                {phase === "reconnect_required"
                  ? "Reconnect with Facebook"
                  : "Connect Facebook"}
                <span aria-hidden>→</span>
              </a>
            ) : (
              <p className="mb-0 text-sm text-[#5c554c]">
                Meta isn’t set up on this server yet. Contact your administrator.
              </p>
            )}
            <p className="mt-5 mb-0 text-sm text-[#7a7166]">
              You’ll sign in with Facebook and choose the Page Hey Ralli should
              use.
            </p>
            {phase === "reconnect_required" && !configuredViaEnv ? (
              <button
                type="button"
                className={`${btnGhostClassName} mt-3`}
                disabled={isPending}
                onClick={handleDisconnect}
              >
                Disconnect instead
              </button>
            ) : null}
          </div>
          {phase === "not_connected" ? <BeforeYouStart /> : null}
        </div>
      ) : null}

      {/* —— State 2: Facebook connected, Instagram missing —— */}
      {phase === "facebook_only" ? (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.35)] px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PageAvatar
                  pageName={pageLabel}
                  pagePictureUrl={pagePictureUrl}
                />
                <div className="min-w-0">
                  <p className="m-0 truncate font-bold text-[#2a2622]">
                    {pageLabel}
                  </p>
                  <p className="m-0 mt-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#5c554c]">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#2f4a3c]"
                      aria-hidden
                    />
                    Facebook connected
                  </p>
                </div>
              </div>
              {!configuredViaEnv ? (
                <a
                  href={connectHref}
                  className={`${btnChangeClassName} ${isPending ? "pointer-events-none opacity-60" : ""}`}
                >
                  Change
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-7 py-8 text-center shadow-[0_8px_28px_rgba(28,36,48,0.05)]">
            <div
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(193,53,132,0.12)] text-lg font-bold text-[#c13584]"
              aria-hidden
            >
              IG
            </div>
            <h2
              className="m-0 text-2xl font-semibold tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Instagram isn’t connected yet
            </h2>
            <p className="mx-auto mt-2 mb-6 max-w-[38ch] text-sm leading-relaxed text-[#5c554c]">
              Link an Instagram Professional account to this Facebook Page in
              Meta. Hey Ralli can’t create that link for you — after it’s linked,
              use Reconnect so we can detect it.
            </p>
            <div className="flex flex-col items-stretch gap-2 sm:items-center">
              <a
                href={META_LINK_INSTAGRAM_HELP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={btnPrimaryClassName}
              >
                How to connect Instagram
              </a>
              {!configuredViaEnv ? (
                <a
                  href={connectHref}
                  className={`${btnSecondaryClassName} ${isPending ? "pointer-events-none opacity-60" : ""}`}
                >
                  Reconnect to detect Instagram
                </a>
              ) : null}
            </div>
          </div>

          <CapabilityStatusCard
            capabilities={capabilities}
            messagingReady={messagingReady}
            hasInstagram={hasInstagram}
            connected={connected}
            reconnectRequired={reconnectRequired}
          />

          {!configuredViaEnv ? (
            <div className="flex justify-center">
              <button
                type="button"
                className={btnGhostClassName}
                disabled={isPending}
                onClick={handleDisconnect}
              >
                Disconnect Facebook
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* —— State 3: fully connected —— */}
      {phase === "fully_connected" ? (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-7 py-7 shadow-[0_8px_28px_rgba(28,36,48,0.05)]">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PageAvatar
                    pageName={pageLabel}
                    pagePictureUrl={pagePictureUrl}
                  />
                  <div className="min-w-0">
                    <p className="m-0 truncate font-bold text-[#2a2622]">
                      {pageLabel}
                    </p>
                    <p className="m-0 mt-0.5 text-xs font-medium text-[#1877F2]">
                      Facebook Page
                    </p>
                  </div>
                </div>
                <StatusPill tone="ok">Connected</StatusPill>
              </div>

              <div className="h-px bg-[rgba(42,38,34,0.1)]" aria-hidden />

              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <InstagramAvatar
                    username={instagramUsername}
                    pictureUrl={instagramPictureUrl}
                  />
                  <div className="min-w-0">
                    <p className="m-0 truncate font-bold text-[#2a2622]">
                      {instagramUsername?.trim() || "Instagram"}
                    </p>
                    <p className="m-0 mt-0.5 text-xs font-medium text-[#c13584]">
                      Instagram
                    </p>
                  </div>
                </div>
                <StatusPill tone="ok">Connected</StatusPill>
              </div>
            </div>
          </div>

          <CapabilityStatusCard
            capabilities={capabilities}
            messagingReady={messagingReady}
            hasInstagram={hasInstagram}
            connected={connected}
            reconnectRequired={reconnectRequired}
          />

          <div className="flex flex-col gap-2.5 pt-2">
            <Link href={doneHref} className={btnPrimaryClassName}>
              Done
            </Link>
            {!configuredViaEnv ? (
              <>
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={() => setManageOpen((open) => !open)}
                  aria-expanded={manageOpen}
                >
                  Manage connection
                </button>
                {manageOpen ? (
                  <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.4)] px-4 py-3">
                    <a
                      href={connectHref}
                      className={`${btnChangeClassName} ${isPending ? "pointer-events-none opacity-60" : ""}`}
                    >
                      Reconnect
                    </a>
                    <button
                      type="button"
                      className={btnGhostClassName}
                      disabled={isPending}
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mb-0 text-center text-[13px] text-[#5c554c]">
                Connected via server configuration for this environment.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 mb-0 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 mb-0 text-center text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      <p className="mt-10 mb-0 text-center text-xs text-[#7a7166]">
        Organic publishing and inbox only — Hey Ralli does not run Meta ads.
      </p>
    </section>
  );
}

function CapabilityStatusCard({
  capabilities,
  messagingReady,
  hasInstagram,
  connected,
  reconnectRequired,
}: {
  capabilities: ReturnType<typeof getMetaCapabilityStatusLabels>;
  messagingReady: boolean;
  hasInstagram: boolean;
  connected: boolean;
  reconnectRequired: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.35)] px-6 py-5">
      <h3 className="m-0 mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a7166]">
        Connection status
      </h3>
      <div className="grid grid-cols-2 gap-y-3">
        <CapabilityRow
          label="Facebook Page"
          value={capabilities.facebookPage}
          ok={connected && !reconnectRequired}
        />
        <CapabilityRow
          label="Instagram"
          value={capabilities.instagram}
          ok={hasInstagram && !reconnectRequired}
        />
        <CapabilityRow
          label="Messaging"
          value={capabilities.messaging}
          ok={messagingReady && !reconnectRequired}
        />
        <CapabilityRow
          label="Publishing"
          value={capabilities.publishing}
          ok={connected && !reconnectRequired}
        />
      </div>
      {!messagingReady && connected && !reconnectRequired ? (
        <p className="mt-4 mb-0 text-[12px] leading-snug text-[#5c554c]">
          Messaging needs the inbox permissions Facebook grants on Connect. Use
          Reconnect if replies or DMs aren’t available yet.
        </p>
      ) : null}
    </div>
  );
}
