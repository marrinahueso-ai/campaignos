"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, Clock, ShieldCheck, Users, X } from "lucide-react";

import { EmailPreviewDesktop } from "@/components/newsletter-composer/EmailPreviewPhone";
import { Button } from "@/components/ui/Button";
import { newsletterComposerHref } from "@/lib/newsletter/approval";
import { saveDraft, submitForApproval, testSend } from "@/lib/newsletter/actions";
import type { Newsletter, NewsletterAudience } from "@/lib/newsletter/types";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";

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

type Props = {
  newsletter: Newsletter;
  previewState: NewsletterComposerState;
  audiences: NewsletterAudience[];
  memberCountByAudience: Record<string, number>;
  approverDisplayName: string | null;
  isResubmit: boolean;
};

export function NewsletterPreviewSendShell({
  newsletter,
  previewState,
  audiences,
  memberCountByAudience,
  approverDisplayName,
  isResubmit,
}: Props) {
  const router = useRouter();
  const [audienceId, setAudienceId] = useState(newsletter.proposedAudienceId ?? "");
  const [proposedSendAt, setProposedSendAt] = useState(
    isoToDatetimeLocalValue(newsletter.proposedSendAt),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmails, setTestEmails] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testMessage, setTestMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAudience = audiences.find((a) => a.id === audienceId) ?? null;
  const memberCount = audienceId ? memberCountByAudience[audienceId] ?? 0 : 0;
  const composerHref = newsletterComposerHref(newsletter.id);

  async function persistPackage() {
    const result = await saveDraft({
      newsletterId: newsletter.id,
      fields: {
        proposedAudienceId: audienceId || null,
        proposedSendAt: datetimeLocalValueToIso(proposedSendAt),
      },
    });
    return result;
  }

  async function handleSubmit() {
    if (!audienceId) {
      setError("Choose recipients before sending for approval.");
      return;
    }
    if (!proposedSendAt) {
      setError("Choose a send date and time before sending for approval.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await persistPackage();
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      const result = await submitForApproval({
        newsletterId: newsletter.id,
        fields: {
          proposedAudienceId: audienceId,
          proposedSendAt: datetimeLocalValueToIso(proposedSendAt),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/newsletters/${newsletter.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectAudience(nextId: string) {
    setAudienceId(nextId);
    setDrawerOpen(false);
    await saveDraft({
      newsletterId: newsletter.id,
      fields: { proposedAudienceId: nextId || null },
    });
  }

  async function handleTestSend() {
    const emails = testEmails
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      setTestMessage({ ok: false, text: "Enter at least one email address." });
      return;
    }
    setTestBusy(true);
    setTestMessage(null);
    try {
      const result = await testSend({
        newsletterId: newsletter.id,
        recipientEmails: emails,
      });
      setTestMessage(
        result.ok
          ? { ok: true, text: `Test sent to ${result.sentTo.join(", ")}.` }
          : { ok: false, text: result.error },
      );
    } catch {
      setTestMessage({ ok: false, text: "Could not send the test email." });
    } finally {
      setTestBusy(false);
    }
  }

  const approvalLabel = busy
    ? isResubmit
      ? "Resubmitting…"
      : "Submitting…"
    : isResubmit
      ? "Resubmit for Approval"
      : "Send for Approval";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#fcfbf9]">
      <header className="flex h-16 items-center justify-between gap-3 border-b border-cos-border bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={composerHref}
            className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
          >
            ← Back to Editor
          </Link>
          <div className="hidden h-6 w-px bg-cos-border sm:block" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold tracking-[0.12em] text-cos-muted uppercase">
              Preview
            </p>
            <p className="truncate text-sm font-medium text-cos-text">
              {newsletter.title || newsletter.subject || "Newsletter"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setTestOpen((open) => !open);
              setTestMessage(null);
            }}
            disabled={busy || testBusy}
          >
            Send Test Email
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={busy || testBusy}>
            {approvalLabel}
          </Button>
        </div>
      </header>

      {testOpen ? (
        <div className="border-b border-cos-border bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="h-10 min-w-0 flex-1 rounded-lg border border-cos-border bg-cos-bg px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              placeholder="you@school.org, board@school.org"
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              disabled={testBusy}
              aria-label="Test email recipients"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => void handleTestSend()}
                disabled={testBusy || !testEmails.trim()}
              >
                {testBusy ? "Sending…" : "Send test"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setTestOpen(false);
                  setTestMessage(null);
                }}
                disabled={testBusy}
              >
                Cancel
              </Button>
            </div>
          </div>
          {testMessage ? (
            <p
              className={cn(
                "mx-auto mt-2 max-w-3xl text-sm",
                testMessage.ok
                  ? "font-semibold text-cos-brand-sage"
                  : "text-cos-error",
              )}
              role={testMessage.ok ? undefined : "alert"}
            >
              {testMessage.text}
            </p>
          ) : (
            <p className="mx-auto mt-2 max-w-3xl text-xs text-cos-muted">
              Sends a preview to the addresses above — not your full audience.
            </p>
          )}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex-1 overflow-y-auto bg-[#f5f2eb] p-6 sm:p-10">
          <div className="mx-auto max-w-2xl">
            <EmailPreviewDesktop state={previewState} showMailChrome={false} />
          </div>
        </section>

        <aside className="w-full shrink-0 border-t border-cos-border bg-white p-6 sm:p-8 lg:w-[400px] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <h2 className="font-display text-3xl font-semibold text-cos-text">Send Details</h2>

          <div className="mt-8 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold tracking-[0.12em] text-cos-muted uppercase">
                  Recipients
                </p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="text-xs font-bold text-[#0d7e5e] hover:underline"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-cos-border bg-[#f5f2eb] p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cos-border bg-white text-[#0d7e5e]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-cos-text">
                    {selectedAudience?.name ?? "Choose an audience"}
                  </p>
                  <p className="text-sm text-cos-muted">
                    {selectedAudience
                      ? `${memberCount} contact${memberCount === 1 ? "" : "s"}`
                      : "Pick who should receive this issue"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-extrabold tracking-[0.12em] text-cos-muted uppercase">
                Schedule
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-cos-muted">
                    <Calendar className="h-3.5 w-3.5" />
                    Date
                  </span>
                  <input
                    type="date"
                    className="h-11 w-full rounded-xl border border-cos-border bg-[#f5f2eb] px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                    value={proposedSendAt.slice(0, 10)}
                    onChange={(e) => {
                      const date = e.target.value;
                      const time = proposedSendAt.slice(11, 16) || "08:00";
                      const next = date ? `${date}T${time}` : "";
                      setProposedSendAt(next);
                      void saveDraft({
                        newsletterId: newsletter.id,
                        fields: {
                          proposedSendAt: datetimeLocalValueToIso(next),
                        },
                      });
                    }}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-cos-muted">
                    <Clock className="h-3.5 w-3.5" />
                    Time
                  </span>
                  <input
                    type="time"
                    className="h-11 w-full rounded-xl border border-cos-border bg-[#f5f2eb] px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                    value={proposedSendAt.slice(11, 16)}
                    onChange={(e) => {
                      const time = e.target.value;
                      const date =
                        proposedSendAt.slice(0, 10) ||
                        new Date().toISOString().slice(0, 10);
                      const next = time ? `${date}T${time}` : "";
                      setProposedSendAt(next);
                      void saveDraft({
                        newsletterId: newsletter.id,
                        fields: {
                          proposedSendAt: datetimeLocalValueToIso(next),
                        },
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-[#e6f3ee] bg-[#e6f3ee]/60 p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0d7e5e]" />
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold tracking-wider text-[#0d7e5e] uppercase">
                  Approval required
                </p>
                <p className="text-xs leading-relaxed text-cos-text">
                  {approverDisplayName
                    ? `This newsletter will go to ${approverDisplayName} for review. Approve & Schedule locks content, recipients, and this send time.`
                    : "An approver will review content, recipients, and send time before it is scheduled."}
                </p>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-cos-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 lg:hidden">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setTestOpen(true);
                  setTestMessage(null);
                }}
                disabled={busy || testBusy}
              >
                Send Test Email
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={handleSubmit}
                disabled={busy || testBusy}
              >
                {isResubmit ? "Resubmit for Approval" : "Send for Approval"}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[rgba(44,40,37,0.4)] backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-cos-border p-6">
              <h3 className="font-display text-2xl font-semibold">Select Recipients</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cos-border text-cos-muted hover:text-cos-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              {audiences.map((audience) => {
                const count = memberCountByAudience[audience.id] ?? 0;
                const selected = audience.id === audienceId;
                return (
                  <button
                    key={audience.id}
                    type="button"
                    onClick={() => void handleSelectAudience(audience.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition",
                      selected
                        ? "border-[#0d7e5e] bg-[#f5f2eb]"
                        : "border-cos-border hover:border-[#6b8171]",
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full border-4 bg-white",
                        selected ? "border-[#0d7e5e]" : "border-cos-border",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-cos-text">{audience.name}</span>
                      <span className="block text-sm text-cos-muted">
                        {count} contact{count === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })}
              {audiences.length === 0 ? (
                <p className="text-sm text-cos-muted">No audiences yet.</p>
              ) : null}
            </div>
            <div className="border-t border-cos-border p-4">
              <Link
                href={`/newsletter-contacts?tab=audiences&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}/preview`)}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d7e5e] hover:underline"
              >
                <Clock className="h-3.5 w-3.5" />
                Manage audiences in Contacts
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
