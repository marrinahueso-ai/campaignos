"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, Clock, ShieldCheck, Users, X } from "lucide-react";

import { EmailPreviewDesktop } from "@/components/newsletter-composer/EmailPreviewPhone";
import { Button } from "@/components/ui/Button";
import { newsletterComposerHref } from "@/lib/newsletter/approval";
import { saveDraft, submitForApproval } from "@/lib/newsletter/actions";
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#fcfbf9]">
      <header className="flex h-16 items-center justify-between border-b border-cos-border bg-white px-4 sm:px-6">
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
        <Button type="button" onClick={handleSubmit} disabled={busy}>
          {busy
            ? isResubmit
              ? "Resubmitting…"
              : "Submitting…"
            : isResubmit
              ? "Resubmit for Approval"
              : "Send for Approval"}
        </Button>
      </header>

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
                      : "Select from your saved audiences"}
                  </p>
                </div>
              </div>
              {audiences.length === 0 ? (
                <p className="text-xs text-cos-muted">
                  No audiences yet —{" "}
                  <Link
                    href={`/newsletter-contacts?tab=audiences&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}/preview`)}`}
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    create one
                  </Link>
                  , then return here.
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-extrabold tracking-[0.12em] text-cos-muted uppercase">
                Schedule
              </p>
              <label className="block rounded-2xl border border-cos-border bg-white p-4">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-wider text-cos-muted uppercase">
                  <Calendar className="h-3.5 w-3.5" /> Date &amp; time
                </span>
                <input
                  type="datetime-local"
                  className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
                  value={proposedSendAt}
                  onChange={(e) => setProposedSendAt(e.target.value)}
                  onBlur={() => {
                    void saveDraft({
                      newsletterId: newsletter.id,
                      fields: {
                        proposedSendAt: datetimeLocalValueToIso(proposedSendAt),
                      },
                    });
                  }}
                />
              </label>
              <p className="px-1 text-[10px] text-cos-muted italic">
                Approving will schedule this send for the time you choose. Your local timezone is
                used.
              </p>
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

            <Button
              type="button"
              className="w-full lg:hidden"
              onClick={handleSubmit}
              disabled={busy}
            >
              {isResubmit ? "Resubmit for Approval" : "Send for Approval"}
            </Button>
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
