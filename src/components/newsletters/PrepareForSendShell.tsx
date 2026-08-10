"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

import { SettingsBox } from "@/components/homepage-composer/SettingsBox";
import { NewsletterStatusBadge } from "@/components/newsletters/NewsletterStatusBadge";
import { Button } from "@/components/ui/Button";
import {
  cancelSchedule,
  changeAudience,
  reschedule,
  schedule,
  sendNow,
  testSend,
} from "@/lib/newsletter/actions";
import type {
  Newsletter,
  NewsletterAudience,
  NewsletterSend,
  NewsletterSendValidationResult,
  NewsletterSenderProfile,
} from "@/lib/newsletter/types";
import { formatDateTime } from "@/lib/utils/dates";

interface PrepareForSendShellProps {
  newsletter: Newsletter;
  audiences: NewsletterAudience[];
  approvedAudience: NewsletterAudience | null;
  senderProfile: NewsletterSenderProfile;
  validation: NewsletterSendValidationResult;
  productionSendEnabled: boolean;
  currentScheduledSend: NewsletterSend | null;
}

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalValueToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function SendTestPanel({ newsletterId }: { newsletterId: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSend() {
    const emails = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await testSend({ newsletterId, recipientEmails: emails });
      setResult(
        res.ok
          ? { ok: true, message: `Test sent to ${res.sentTo.join(", ")}.` }
          : { ok: false, message: res.error },
      );
    } catch {
      setResult({ ok: false, message: "Could not send the test email." });
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Send test
      </Button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-cos-border bg-cos-bg/60 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-cos-text">Send a test email</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-cos-muted transition hover:text-cos-text"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-10 min-w-[220px] flex-1 rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
          placeholder="you@school.org, board@school.org"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={sending}
        />
        <Button type="button" onClick={handleSend} disabled={sending || !value.trim()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
      {result ? (
        <p
          className={`mt-2 text-sm ${result.ok ? "font-semibold text-cos-brand-sage" : "text-cos-error"}`}
          role={result.ok ? undefined : "alert"}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

export function PrepareForSendShell({
  newsletter,
  audiences,
  approvedAudience,
  senderProfile,
  validation,
  productionSendEnabled,
  currentScheduledSend,
}: PrepareForSendShellProps) {
  const router = useRouter();
  const [timing, setTiming] = useState<"now" | "schedule">("now");
  const [scheduledForValue, setScheduledForValue] = useState(
    isoToDatetimeLocalValue(newsletter.scheduledSendAt),
  );
  const [audienceId, setAudienceId] = useState(newsletter.approvedAudienceId ?? "");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [audienceInvalidated, setAudienceInvalidated] = useState(false);

  const eligibility = validation.ok ? validation.context.eligibility : null;
  const blockingErrors = validation.ok ? [] : validation.errors;

  async function handleChangeAudience() {
    if (!audienceId || audienceId === newsletter.approvedAudienceId) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await changeAudience({ newsletterId: newsletter.id, audienceId });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.invalidated) {
        setAudienceInvalidated(true);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSendNow() {
    setBusy(true);
    setActionError(null);
    try {
      const result = await sendNow({ newsletterId: newsletter.id });
      if (!result.ok) {
        setActionError(result.errors.join(" "));
        return;
      }
      router.push(`/newsletters/${newsletter.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule() {
    const iso = datetimeLocalValueToIso(scheduledForValue);
    if (!iso) {
      setActionError("Choose a future date and time.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const result = newsletter.status === "scheduled"
        ? await reschedule({ newsletterId: newsletter.id, scheduledFor: iso })
        : await schedule({ newsletterId: newsletter.id, scheduledFor: iso });
      if (!result.ok) {
        setActionError("errors" in result ? result.errors.join(" ") : result.error);
        return;
      }
      router.push(`/newsletters/${newsletter.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelSchedule() {
    setBusy(true);
    setActionError(null);
    try {
      const result = await cancelSchedule(newsletter.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (audienceInvalidated) {
    return (
      <div className="studio-page space-y-4">
        <div className="rounded-2xl border border-cos-brand-terracotta/30 bg-cos-brand-terracotta-soft px-4 py-4 text-sm text-cos-brand-terracotta">
          <p className="font-semibold">Audience changed — approval required again</p>
          <p className="mt-1">
            This audience is different from the approved audience. Approval is required again
            before sending.
          </p>
          <Link
            href={`/newsletters/${newsletter.id}?prepare=approval`}
            className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-cos-brand-terracotta px-4 text-sm font-bold text-white transition hover:opacity-90"
          >
            Send for reapproval
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-page space-y-6">
      <div>
        <Link
          href={`/newsletters/${newsletter.id}`}
          className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← {newsletter.title || "Newsletter"}
        </Link>
      </div>

      <header className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-cos-text">
          Send newsletter
        </h1>
        <NewsletterStatusBadge status={newsletter.status} />
      </header>

      {!productionSendEnabled ? (
        <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          Newsletter production sending is not enabled for this environment. Send Now and
          Schedule are disabled — test sends are still available.
        </div>
      ) : null}

      {blockingErrors.length > 0 ? (
        <SettingsBox title="Before this can send" description="Everything below must be resolved.">
          <ul className="list-disc space-y-1 pl-5 text-sm text-cos-muted">
            {blockingErrors
              .filter((message) => !message.includes("production sending is disabled"))
              .map((message, index) => (
                <li key={index}>{message}</li>
              ))}
          </ul>
        </SettingsBox>
      ) : null}

      {actionError ? (
        <p className="text-sm text-cos-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsBox title="Audience" description="Who will receive this newsletter.">
          <div className="space-y-3">
            <p className="text-sm text-cos-text">
              Approved audience: <strong>{approvedAudience?.name ?? "—"}</strong>
            </p>
            {eligibility ? (
              <p className="text-sm text-cos-muted">
                {eligibility.eligible} eligible · {eligibility.excluded} excluded ·{" "}
                {eligibility.selected} total in audience
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 flex-1 rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                value={audienceId}
                onChange={(e) => setAudienceId(e.target.value)}
                disabled={busy}
              >
                {audiences.map((audience) => (
                  <option key={audience.id} value={audience.id}>
                    {audience.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                onClick={handleChangeAudience}
                disabled={busy || !audienceId || audienceId === newsletter.approvedAudienceId}
              >
                Change audience
              </Button>
            </div>
            <p className="text-xs text-cos-muted">
              Changing the audience after approval invalidates it and requires re-approval.
            </p>
          </div>
        </SettingsBox>

        <SettingsBox title="From" description="Set from your organization's verified sender.">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-cos-muted">From</dt>
            <dd className="text-cos-text">
              {newsletter.fromDisplayName || senderProfile.fromDisplayName || "—"} (
              {newsletter.fromEmail || senderProfile.fromEmail || "—"})
            </dd>
            <dt className="text-cos-muted">Reply-to</dt>
            <dd className="text-cos-text">{newsletter.replyToEmail || "—"}</dd>
          </dl>
        </SettingsBox>
      </div>

      <SettingsBox title="Send a test" description="Preview delivery to yourself before sending.">
        <SendTestPanel newsletterId={newsletter.id} />
      </SettingsBox>

      {newsletter.status === "scheduled" && currentScheduledSend ? (
        <SettingsBox
          title="Scheduled"
          description={`This send is scheduled for ${formatDateTime(currentScheduledSend.scheduledFor ?? newsletter.scheduledSendAt ?? "")}.`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              className="h-10 rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              value={scheduledForValue}
              onChange={(e) => setScheduledForValue(e.target.value)}
              disabled={busy}
            />
            <Button type="button" variant="secondary" onClick={handleSchedule} disabled={busy}>
              Reschedule
            </Button>
            <Button type="button" variant="danger" onClick={handleCancelSchedule} disabled={busy}>
              Cancel schedule
            </Button>
          </div>
        </SettingsBox>
      ) : (
        <SettingsBox title="Timing" description="Send immediately or schedule for later.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTiming("now")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  timing === "now"
                    ? "bg-cos-text text-cos-card"
                    : "border border-cos-border text-cos-muted"
                }`}
              >
                Send now
              </button>
              <button
                type="button"
                onClick={() => setTiming("schedule")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  timing === "schedule"
                    ? "bg-cos-text text-cos-card"
                    : "border border-cos-border text-cos-muted"
                }`}
              >
                Schedule
              </button>
            </div>
            {timing === "schedule" ? (
              <input
                type="datetime-local"
                className="h-10 w-full max-w-xs rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                value={scheduledForValue}
                onChange={(e) => setScheduledForValue(e.target.value)}
                disabled={busy}
              />
            ) : null}
            <Button
              type="button"
              onClick={timing === "now" ? handleSendNow : handleSchedule}
              disabled={busy || !productionSendEnabled || blockingErrors.length > 0}
            >
              {busy ? "Working…" : timing === "now" ? "Send now" : "Schedule send"}
            </Button>
          </div>
        </SettingsBox>
      )}
    </div>
  );
}
