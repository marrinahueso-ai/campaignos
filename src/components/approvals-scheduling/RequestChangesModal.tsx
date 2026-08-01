"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { ArtworkLightboxThumbnail } from "@/components/artwork/ArtworkLightboxThumbnail";
import type { RevisionTag } from "@/components/approvals-revision/types";
import {
  FLYER_REVISION_TAGS,
  SOCIAL_REVISION_TAGS,
} from "@/lib/approvals-revision/revision-notes";
import { requestUnifiedChangesAction } from "@/lib/approvals-scheduling/actions";
import { isFlyerComposerMilestoneId } from "@/lib/flyer-composer/approval";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

function isFlyerItem(item: UnifiedApprovalItem): boolean {
  return (
    item.channel === "flyer" ||
    isFlyerComposerMilestoneId(item.campaignMilestoneId)
  );
}

interface RequestChangesModalProps {
  item: UnifiedApprovalItem | null;
  open: boolean;
  onClose: () => void;
  onBackToReview: () => void;
  onSuccess: () => void;
}

export function RequestChangesModal({
  item,
  open,
  onClose,
  onBackToReview,
  onSuccess,
}: RequestChangesModalProps) {
  const isFlyer = item ? isFlyerItem(item) : false;
  const tagOptions = isFlyer ? FLYER_REVISION_TAGS : SOCIAL_REVISION_TAGS;
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<RevisionTag[]>(["Artwork", "Date"]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setNote("");
    setTags(["Artwork", "Date"]);
    setError(null);
  }, [open, item?.id]);

  if (!open || !item) {
    return null;
  }

  function toggleTag(tag: RevisionTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function onSend() {
    if (!note.trim()) {
      setError("Add a short note so the creator knows what to change.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestUnifiedChangesAction({
        eventId: item!.eventId,
        communicationItemId: item!.communicationItemId,
        schedulingItemId: item!.schedulingItemId,
        comment: note,
        tags,
        campaignName: item!.campaignName,
        milestoneName: item!.milestoneName,
      });
      if (!result.success) {
        setError(result.error ?? "Couldn’t send those changes. Try again.");
        return;
      }
      onSuccess();
    });
  }

  const feedUrl = item.preview.feedArtworkUrl;
  const storyUrl = isFlyer ? null : item.preview.storyArtworkUrl;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[rgba(28,36,48,0.55)] backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[22px] border border-cos-border bg-[#fffcf7] shadow-[0_24px_64px_rgba(28,36,48,0.28)] sm:rounded-[22px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-changes-title"
      >
        {/* Quiet warm hero only — body stays cream so color doesn’t scream. */}
        <div
          className="h-1 shrink-0 bg-gradient-to-r from-[#c4922e]/70% via-[#d06650]/55% to-[#c4922e]/70%"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3 border-b border-cos-border bg-gradient-to-br from-[#f7efe6] via-[#faf6f0] to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBackToReview}
              className="mb-2 text-xs font-bold text-cos-muted transition hover:text-cos-text"
            >
              ← Back to review
            </button>
            <p className="mb-1.5 inline-flex rounded-full border border-[rgba(196,146,46,0.35)] bg-[rgba(196,146,46,0.12)] px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-[#7a5a12] uppercase">
              Change request
            </p>
            <h2
              id="request-changes-title"
              className="font-display text-2xl tracking-[-0.02em] text-cos-text italic sm:text-[1.75rem]"
            >
              Request changes
            </h2>
            <p className="mt-1 text-sm text-cos-muted">
              {isFlyer
                ? "Tell the creator what to fix on the print flyer. They’ll update it and send it back."
                : "Tell the creator what to fix. They’ll update the post and send it back."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cos-border bg-white text-cos-muted transition hover:text-cos-text"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-3 text-sm font-bold text-cos-text">
            {item.campaignName}
            <span className="font-semibold text-cos-muted">
              {" "}
              · {item.milestoneName}
            </span>
          </p>

          <div className="mb-5 flex flex-wrap items-end gap-3">
            {isFlyer ? (
              <ArtworkLightboxThumbnail
                src={feedUrl}
                alt=""
                variant="feed"
                wrapperClassName="w-[88px]"
                frameClassName="aspect-[2/3] w-full rounded-xl"
                placeholder="—"
              />
            ) : (
              <>
                <ArtworkLightboxThumbnail
                  src={feedUrl}
                  alt=""
                  variant="feed"
                  wrapperClassName="w-[88px]"
                  frameClassName="aspect-square w-full rounded-xl"
                  placeholder="—"
                />
                {storyUrl ? (
                  <ArtworkLightboxThumbnail
                    src={storyUrl}
                    alt=""
                    variant="story"
                    wrapperClassName="w-[56px]"
                    frameClassName="aspect-[9/16] w-full rounded-xl"
                    placeholder="—"
                  />
                ) : null}
              </>
            )}
          </div>

          <label
            htmlFor="request-changes-note"
            className="mb-2 block text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase"
          >
            What should change?
          </label>
          <textarea
            id="request-changes-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            disabled={pending}
            placeholder="e.g. Warm up the headline, make the logo bigger, move the date…"
            className="w-full rounded-[14px] border border-cos-border bg-white px-4 py-3 text-sm leading-relaxed text-cos-text placeholder:text-cos-muted focus:border-[#6b8171] focus:outline-none"
          />

          <p className="mt-4 mb-2 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Tag what needs work
          </p>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => {
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

          {error ? (
            <p className="mt-3 text-sm text-[#a65a3a]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-cos-border bg-[rgba(246,242,235,0.55)] px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={pending}
            onClick={onBackToReview}
            className="rounded-[12px] border border-cos-border bg-white px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:border-[#6b8171] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={onSend}
            className="rounded-[12px] bg-[#2f4a3c] px-5 py-2.5 text-[13px] font-bold text-[#fffcf7] transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Sending…" : "Send change request"}
          </button>
        </div>
      </div>
    </div>
  );
}
