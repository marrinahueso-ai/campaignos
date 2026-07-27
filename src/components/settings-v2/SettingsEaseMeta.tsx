"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buildMetaOAuthStartPath } from "@/lib/integrations/oauth";
import { disconnectMetaConnectionAction } from "@/lib/meta-publishing/connection-actions";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import type { MetaConnection } from "@/lib/meta-publishing/types";

interface SettingsEaseMetaProps {
  organizationName: string | null;
  connection: MetaConnection | null;
  configuredViaEnv: boolean;
  integrationConfigured: boolean;
  reconnectRequired: boolean;
  returnTo: string;
  statusMessage: string | null;
  statusHint: string | null;
  statusTone: "success" | "error" | null;
  pagesHint: string | null;
}

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnGhostClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-transparent px-[18px] py-[11px] text-[13px] font-bold text-[#7a7166] transition-colors duration-100 hover:text-[#2a2622] disabled:cursor-not-allowed disabled:opacity-60";

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-[rgba(42,38,34,0.1)] py-[11px] text-sm last:border-b-0">
      <span className="text-[#7a7166]">{label}</span>
      <span className="text-right font-semibold text-[#2a2622]">{value}</span>
    </div>
  );
}

function HonestList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 mb-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#5c554c]"
        >
          <span
            className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full bg-[#6b8171]"
            aria-hidden
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function SettingsEaseMeta({
  organizationName,
  connection,
  configuredViaEnv,
  integrationConfigured,
  reconnectRequired,
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

  const connected = isMetaConnectionConfigured(connection);
  const hasInstagram = isInstagramPublishingConfigured(connection);
  const orgLabel = organizationName ?? "your organization";
  const pageLabel = connection?.pageName?.trim() || "Facebook Page";

  const connectHref = buildMetaOAuthStartPath({
    returnTo,
    pageId: connected ? connection?.facebookPageId : undefined,
    authType: connected || reconnectRequired ? "rerequest" : undefined,
  });

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
      ? "Connected"
      : "Not connected";

  return (
    <section data-settings-ease="meta">
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

      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Facebook &amp; Instagram
          </h1>
          <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
            Connect once for {orgLabel}. Approve the list Facebook shows —
            that&apos;s it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={statusTonePill}>{statusLabel}</StatusPill>
        </div>
      </div>

      {statusMessage ? (
        <p
          className={
            statusTone === "success"
              ? "mb-3.5 text-sm text-emerald-700"
              : "mb-3.5 text-sm text-red-600"
          }
          role="status"
        >
          {statusMessage}
          {statusHint ? (
            <span className="mt-1 block text-[#5c554c]">{statusHint}</span>
          ) : null}
          {pagesHint ? (
            <span className="mt-1 block text-[#5c554c]">
              Facebook granted access to page ID(s):{" "}
              <code className="rounded bg-[rgba(246,242,235,0.8)] px-1">
                {pagesHint}
              </code>
              . Set{" "}
              <code className="rounded bg-[rgba(246,242,235,0.8)] px-1">
                META_FACEBOOK_PAGE_ID
              </code>{" "}
              to one of those IDs on your server, then reconnect.
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mb-3.5 rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[linear-gradient(135deg,rgba(47,74,60,0.06),transparent_55%),#fffcf7] px-[26px] py-7 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        {connected && !reconnectRequired ? (
          <>
            <h2
              className="m-0 text-[26px] font-semibold tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              Connected for this organization
            </h2>
            <p className="mt-2 mb-0 max-w-[48ch] text-sm leading-[1.5] text-[#5c554c]">
              Publishing, Communications Hub inbox, and Insights use this Page
              connection. Organic posts only — no paid ads in Hey Ralli.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(42,38,34,0.1)] bg-[rgba(255,252,247,0.9)] px-3 py-1.5 text-xs font-bold text-[#5c554c]">
                <span
                  className="h-2 w-2 rounded-full bg-[#1877f2]"
                  aria-hidden
                />
                {pageLabel}
              </span>
              {hasInstagram ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(42,38,34,0.1)] bg-[rgba(255,252,247,0.9)] px-3 py-1.5 text-xs font-bold text-[#5c554c]">
                  <span
                    className="h-2 w-2 rounded-full bg-[#c13584]"
                    aria-hidden
                  />
                  Linked Instagram
                </span>
              ) : null}
            </div>
            <HonestList
              items={[
                "Publish and schedule posts to your Facebook Page and linked Instagram account",
                "Read and reply to Page/Instagram comments and DMs in Communications Hub",
                "Pull Page Insights metrics for Org Insights (views, reach, interactions)",
              ]}
            />
            {!configuredViaEnv ? (
              <div className="mt-[18px] flex flex-wrap gap-2">
                <a
                  href={connectHref}
                  className={`${btnSecondaryClassName} ${isPending ? "pointer-events-none opacity-60" : ""}`}
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
            ) : (
              <p className="mt-[18px] mb-0 text-[13px] text-[#5c554c]">
                Connected via server configuration for this environment.
              </p>
            )}
          </>
        ) : (
          <>
            <h2
              className="m-0 text-[26px] font-semibold tracking-[-0.02em] text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {reconnectRequired
                ? "Reconnect Facebook & Instagram"
                : "Connect Facebook & Instagram"}
            </h2>
            <p className="mt-2 mb-0 max-w-[48ch] text-sm leading-[1.5] text-[#5c554c]">
              {reconnectRequired
                ? "Facebook needs you to sign in again. One click restores publishing, inbox, and Insights."
                : `One button for ${orgLabel}. Facebook shows what Hey Ralli can do — you approve.`}
            </p>
            <HonestList
              items={[
                "Publish and schedule posts to your Facebook Page and linked Instagram account",
                "Read and reply to Page/Instagram comments and DMs in Communications Hub",
                "Pull Page Insights metrics for Org Insights (views, reach, interactions)",
              ]}
            />
            <div className="mt-[18px] flex flex-wrap gap-2">
              {integrationConfigured || configuredViaEnv ? (
                <a
                  href={connectHref}
                  className={`${btnPrimaryClassName} ${isPending ? "pointer-events-none opacity-60" : ""}`}
                >
                  {reconnectRequired
                    ? "Reconnect with Facebook"
                    : "Connect with Facebook"}
                </a>
              ) : (
                <p className="mb-0 text-sm text-[#5c554c]">
                  Meta publishing isn&apos;t set up on this server yet. Contact
                  your administrator.
                </p>
              )}
            </div>
          </>
        )}

        {error ? (
          <p className="mt-3 mb-0 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-3 mb-0 text-sm text-emerald-700" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <div className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="mb-3.5">
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            What Facebook will ask
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            Clear purpose copy for Meta App Review.
          </p>
        </div>
        <DetailRow label="Pages" value="Manage and publish content" />
        <DetailRow label="Instagram" value="Manage messaging & content" />
        <DetailRow label="Insights" value="Read performance metrics" />
      </div>
    </section>
  );
}
