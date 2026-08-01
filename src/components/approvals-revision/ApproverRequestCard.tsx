"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RevisionArtworkPair } from "@/components/approvals-revision/RevisionArtworkPair";
import type {
  RevisionTag,
  RevisionWorkspaceModel,
} from "@/components/approvals-revision/types";
import {
  FLYER_REVISION_TAGS,
  SOCIAL_REVISION_TAGS,
} from "@/lib/approvals-revision/revision-notes";
import { requestUnifiedChangesAction } from "@/lib/approvals-scheduling/actions";

/**
 * Approver Request changes card — UX Pilot: note + tags, then Send.
 * Approve stays on open review. Branches Social vs Flyer from contentType.
 */
export function ApproverRequestCard({
  model,
}: {
  model: RevisionWorkspaceModel;
}) {
  const router = useRouter();
  const isFlyer = model.contentType === "flyer";
  const tagOptions = isFlyer ? FLYER_REVISION_TAGS : SOCIAL_REVISION_TAGS;
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(model.noteBody);
  const [tags, setTags] = useState<RevisionTag[]>(
    model.revisionTags.length > 0
      ? model.revisionTags.filter((t) => tagOptions.includes(t))
      : ["Artwork", "Date"],
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canSend = note.trim().length > 0;

  function toggleTag(tag: RevisionTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function onSendChangeRequest() {
    if (model.isDemo) {
      setMessage(
        "Demo fixture — open a real Changes item from Approvals to save.",
      );
      return;
    }
    if (!note.trim()) {
      setError("Add a short note so the creator knows what to change.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestUnifiedChangesAction({
        eventId: model.eventId,
        communicationItemId: model.communicationItemId,
        schedulingItemId: model.schedulingItemId,
        comment: note,
        tags,
        campaignName: model.campaignName,
        milestoneName: model.milestoneName,
      });
      if (!result.success) {
        setError(result.error ?? "Couldn’t send those changes. Try again.");
        return;
      }
      router.push("/approvals");
      router.refresh();
    });
  }

  return (
    <div className="rev-shell">
      <Link href={model.backHref} className="rev-back">
        ← Back to review
      </Link>
      <h1>{model.title}</h1>
      <p className="rev-lede">
        {isFlyer
          ? "Tell the creator what to fix on the print flyer. They’ll update it and send it back."
          : "Tell the creator what to fix. They’ll update the post and send it back."}
      </p>

      <div className="rev-card">
        <div className="rev-meta-row">
          <span className="rev-type-chip">{model.typeChip}</span>
          <span className="rev-status-chip is-review">{model.statusChip}</span>
          <span className="rev-meta-title">{model.contextLine}</span>
        </div>

        <div className="rev-split">
          <div>
            <RevisionArtworkPair
              variant={isFlyer ? "flyer" : "social"}
              feedUrl={model.feedArtworkUrl}
              storyUrl={isFlyer ? null : model.storyArtworkUrl}
              title={model.previewTitle}
              subtitle={model.previewSubtitle}
            />
          </div>

          <div>
            <div className="rev-field">
              <label htmlFor="rev-approver-note">What should change?</label>
              <textarea
                id="rev-approver-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Warm up the headline, make the logo bigger, move the date to Aug 12…"
                disabled={pending}
              />
            </div>
            <div className="rev-field">
              <label>Tag what needs work (helps their checklist)</label>
              <div className="rev-chips">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={tags.includes(tag) ? "is-on" : undefined}
                    aria-pressed={tags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                    disabled={pending}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="rev-actions">
              <button
                type="button"
                className="rev-btn rev-btn-primary"
                onClick={onSendChangeRequest}
                disabled={pending || !canSend}
              >
                {pending ? "Sending…" : "Send change request"}
              </button>
              <Link href={model.backHref} className="rev-btn rev-btn-secondary">
                Cancel
              </Link>
              <p className="rev-hint">
                Tags become the creator’s revision checklist. Creator will be
                notified by email.
              </p>
              {error ? (
                <p className="rev-hint" role="alert" style={{ color: "#a65a3a" }}>
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rev-hint" role="status">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
