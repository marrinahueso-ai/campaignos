"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Printer, X } from "lucide-react";

import { FlyerStatusBadge } from "@/components/flyers/FlyerStatusBadge";
import type { RevisionTag } from "@/components/approvals-revision/types";
import { FLYER_REVISION_TAGS } from "@/lib/approvals-revision/revision-notes";
import {
  approveUnifiedItemAction,
  requestUnifiedChangesAction,
} from "@/lib/approvals-scheduling/actions";
import {
  downloadFlyerExport,
  printFlyerExport,
  saveFlyerToEventFiles,
} from "@/lib/flyer-composer/flyer-export-client";
import { printSizeLabel } from "@/lib/flyers/generate-payload";
import type { Flyer } from "@/lib/flyers/types";
import { cn } from "@/lib/utils/cn";

export type FlyerReviewEventInfo = {
  id: string;
  title: string;
  date: string | null;
};

type Props = {
  flyer: Flyer;
  event: FlyerReviewEventInfo | null;
  submittedByName: string | null;
  canApprove: boolean;
  isCreatorViewing: boolean;
};

function formatEventDate(date: string | null): string {
  if (!date?.trim()) return "—";
  try {
    return new Date(`${date.trim()}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export function FlyerApproverReviewShell({
  flyer,
  event,
  submittedByName,
  canApprove,
  isCreatorViewing,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<RevisionTag[]>(["Artwork", "Layout"]);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [status, setStatus] = useState(flyer.status);

  const previewImageUrl = flyer.previewImageUrl;
  const isHalf = flyer.printSize === "half";
  const canExport = status === "approved" && Boolean(previewImageUrl);

  const schedulingItemId = flyer.approvalSchedulingItemId;
  const waitingAsCreator =
    isCreatorViewing && status === "needs_approval" && !canApprove;
  const showApproverActions =
    canApprove &&
    status === "needs_approval" &&
    Boolean(schedulingItemId);

  function toggleTag(tag: RevisionTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleApprove() {
    if (!schedulingItemId) return;
    setError(null);
    startTransition(async () => {
      const result = await approveUnifiedItemAction({
        eventId: flyer.eventId ?? "",
        schedulingItemId,
        campaignName: "Flyer",
        milestoneName: flyer.title?.trim() || "Flyer",
      });
      if (!result.success) {
        setError(result.error ?? "Couldn’t approve that flyer.");
        return;
      }
      setStatus("approved");
      router.refresh();
    });
  }

  function handleRequestChanges() {
    if (!schedulingItemId) return;
    if (!note.trim()) {
      setError("Add a short note so the creator knows what to change.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestUnifiedChangesAction({
        eventId: flyer.eventId ?? "",
        schedulingItemId,
        comment: note,
        tags,
        campaignName: "Flyer",
        milestoneName: flyer.title?.trim() || "Flyer",
      });
      if (!result.success) {
        setError(result.error ?? "Couldn’t send those changes.");
        return;
      }
      setModalOpen(false);
      setStatus("changes_requested");
      router.push(`/flyers/${flyer.id}/changes`);
    });
  }

  const exportActions = canExport ? (
    <div className="space-y-3">
      <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
        Export & Actions
      </label>
      <button
        type="button"
        onClick={() => {
          if (!previewImageUrl) return;
          setError(null);
          void downloadFlyerExport({
            imageUrl: previewImageUrl,
            filenameBase: flyer.title || "flyer",
            printSize: flyer.printSize,
          }).catch(() => {
            setError("Could not download flyer.");
          });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg"
      >
        <Download className="h-3.5 w-3.5" />{" "}
        {isHalf ? "Download PNG (2 per page)" : "Download PNG"}
      </button>
      <button
        type="button"
        onClick={() =>
          previewImageUrl && printFlyerExport(previewImageUrl, flyer.printSize)
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg"
      >
        <Printer className="h-3.5 w-3.5" />{" "}
        {isHalf ? "Print (2 per page)" : "Print"}
      </button>
      {flyer.eventId ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!previewImageUrl || !flyer.eventId) return;
            setError(null);
            setSaveMessage(null);
            startTransition(async () => {
              try {
                const result = await saveFlyerToEventFiles({
                  eventId: flyer.eventId,
                  imageUrl: previewImageUrl,
                  title: flyer.title?.trim() || null,
                  versionId: flyer.composerState.activeVersionId ?? null,
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setSaveMessage(result.message);
              } catch {
                setError("Couldn’t save to Files. Try again.");
              }
            });
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save to Files"}
        </button>
      ) : (
        <p className="text-[11px] leading-snug text-cos-muted">
          Link this flyer to an event in the builder to save it to Files.
        </p>
      )}
      {saveMessage ? (
        <p className="text-[11px] font-medium text-[#0d7e5e]">{saveMessage}</p>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-3.75rem)] min-h-[560px] flex-col overflow-hidden bg-[#fffcf7] lg:-mx-8 lg:-my-10">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-cos-border bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {status === "approved" ? (
            <FlyerStatusBadge status="approved" />
          ) : status === "changes_requested" ? (
            <FlyerStatusBadge status="changes_requested" />
          ) : (
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-blue-600 uppercase">
              Pending Review
            </span>
          )}
          <h1 className="truncate text-sm font-bold text-cos-text">
            {flyer.title?.trim() || "Untitled flyer"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/flyers"
            className="text-sm font-medium text-cos-muted transition hover:text-cos-text"
          >
            Cancel
          </Link>
          {showApproverActions ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setModalOpen(true);
                }}
                className="rounded-full border border-cos-border px-5 py-2 text-sm font-medium transition hover:bg-cos-bg disabled:opacity-50"
              >
                Request Changes
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleApprove}
                className="rounded-full bg-[#0d7e5e] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0a6b4f] disabled:opacity-50"
              >
                {pending ? "Saving…" : "Approve Flyer"}
              </button>
            </>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-[#a65a3a]" role="alert">
          {error}
        </div>
      ) : null}

      {waitingAsCreator ? (
        <div className="border-b border-blue-100 bg-blue-50 px-6 py-2 text-sm text-blue-800">
          Waiting for approval — your Team Access reviewer will review this flyer.
        </div>
      ) : null}

      {!schedulingItemId && status !== "approved" ? (
        <div className="border-b border-amber-100 bg-amber-50 px-6 py-2 text-sm text-amber-900">
          This flyer hasn’t been sent for approval yet.{" "}
          <Link
            href={`/create-with-ai/flyer?flyerId=${encodeURIComponent(flyer.id)}`}
            className="font-bold underline"
          >
            Open the builder
          </Link>{" "}
          to send it.
        </div>
      ) : null}

      {status === "approved" ? (
        <div className="border-b border-[#0d7e5e]/20 bg-[#e6f3ee] px-6 py-2 text-sm text-[#0d7e5e]">
          Approved.{" "}
          <Link href="/flyers" className="font-bold underline">
            Back to Flyer Library
          </Link>
        </div>
      ) : null}

      {canExport ? (
        <div className="border-b border-cos-border px-4 py-3 md:hidden">
          {exportActions}
        </div>
      ) : null}

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-80 shrink-0 flex-col gap-8 overflow-y-auto border-r border-cos-border bg-cos-bg p-8 md:flex">
          <div className="space-y-4">
            <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
              Submitted By
            </label>
            <div className="rounded-2xl border border-cos-border bg-white p-4">
              <p className="text-sm font-bold text-cos-text">
                {submittedByName || "Teammate"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
              Event Details
            </label>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-cos-muted uppercase">
                  Associated Event
                </p>
                <p className="text-sm font-medium">
                  {event?.title || "No event"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-cos-muted uppercase">
                  Event Date
                </p>
                <p className="text-sm font-medium">
                  {formatEventDate(event?.date ?? null)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-cos-muted uppercase">
                  Size
                </p>
                <p className="text-sm font-medium">
                  {printSizeLabel(flyer.printSize)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-cos-border pt-4">
            <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
              Flyer Description
            </label>
            <p className="text-sm leading-relaxed text-cos-muted italic">
              {flyer.composerState.aiDirection?.trim()
                ? `“${flyer.composerState.aiDirection.trim()}”`
                : "No description provided."}
            </p>
          </div>

          {canExport ? (
            <div className="border-t border-cos-border pt-6">{exportActions}</div>
          ) : null}
        </aside>

        <section className="flex flex-1 items-start justify-center overflow-y-auto bg-[#fffcf7] p-6 sm:p-12 [background-image:radial-gradient(circle_at_1px_1px,rgba(44,40,37,0.1)_1px,transparent_0)] [background-size:24px_24px]">
          <div
            className={cn(
              "w-full overflow-hidden border border-cos-border bg-white",
              flyer.printSize === "half" ? "max-w-[720px]" : "max-w-[700px]",
            )}
          >
            {flyer.previewImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flyer.previewImageUrl}
                alt={flyer.title || "Flyer preview"}
                className={cn(
                  "w-full object-contain",
                  flyer.printSize === "half"
                    ? "aspect-[8.5/5.5]"
                    : "aspect-[8.5/11]",
                )}
              />
            ) : (
              <div className="flex aspect-[8.5/11] items-center justify-center text-sm text-cos-muted">
                No preview available
              </div>
            )}
          </div>
        </section>
      </main>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(44,40,37,0.6)] p-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flyer-request-changes-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="p-8">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3
                    id="flyer-request-changes-title"
                    className="font-display text-2xl font-bold"
                  >
                    Request Changes
                  </h3>
                  <p className="text-sm text-cos-muted">
                    Provide feedback to help the creator improve this flyer.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-cos-muted transition hover:text-cos-text"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={pending}
                placeholder="e.g. Make the QR code larger and add the school logo."
                className="mb-4 w-full resize-none rounded-2xl border border-cos-border bg-cos-bg p-4 text-sm focus:border-[#0d7e5e] focus:outline-none"
              />
              <p className="mb-2 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
                Tag what needs work
              </p>
              <div className="mb-6 flex flex-wrap gap-2">
                {FLYER_REVISION_TAGS.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={pending}
                      aria-pressed={on}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-bold transition",
                        on
                          ? "bg-[#2f4a3c] text-[#fffcf7]"
                          : "border border-cos-border bg-white text-cos-text hover:border-[#6b8171]",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl py-3 text-sm font-medium transition hover:bg-cos-bg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending || !note.trim()}
                  onClick={handleRequestChanges}
                  className="flex-1 rounded-xl bg-cos-text py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                >
                  {pending ? "Sending…" : "Send Feedback"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
