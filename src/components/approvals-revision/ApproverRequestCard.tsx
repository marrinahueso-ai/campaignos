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
  approveUnifiedItemAction,
  requestUnifiedChangesAction,
} from "@/lib/approvals-scheduling/actions";

const DEFAULT_TAGS: RevisionTag[] = [
  "Artwork",
  "Stories",
  "Date",
  "Caption",
  "Copy",
];

/**
 * Approver Request changes card — matches mockup § Approver.
 */
export function ApproverRequestCard({
  model,
}: {
  model: RevisionWorkspaceModel;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(model.noteBody);
  const [tags, setTags] = useState<RevisionTag[]>(
    model.revisionTags.length > 0 ? model.revisionTags : ["Artwork", "Date"],
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function toggleTag(tag: RevisionTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function onRequestChanges() {
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

  function onApprove() {
    if (model.isDemo) {
      setMessage("Demo fixture — approve from a real Approvals item.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await approveUnifiedItemAction({
        eventId: model.eventId,
        communicationItemId: model.communicationItemId,
        schedulingItemId: model.schedulingItemId,
        campaignName: model.campaignName,
        milestoneName: model.milestoneName,
      });
      if (!result.success) {
        setError(result.error ?? "Couldn’t approve that. Try again.");
        return;
      }
      if (result.warning) {
        setMessage(result.warning);
      }
      router.push("/approvals");
      router.refresh();
    });
  }

  return (
    <div className="rev-shell">
      <Link href={model.backHref} className="rev-back">
        ← Back to Approvals
      </Link>
      <h1>{model.title}</h1>
      <p className="rev-lede">
        Review feed (1:1) and story (9:16) together. Add a short note and
        optional tags so the creator checklist writes itself.
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
              feedUrl={model.feedArtworkUrl}
              storyUrl={model.storyArtworkUrl}
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
                placeholder="Add a short note…"
                disabled={pending}
              />
            </div>
            <div className="rev-field">
              <label>Tag what needs work (helps their checklist)</label>
              <div className="rev-chips">
                {DEFAULT_TAGS.map((tag) => (
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
                className="rev-btn rev-btn-danger-soft"
                onClick={onRequestChanges}
                disabled={pending}
              >
                {pending ? "Saving…" : "Request changes"}
              </button>
              <button
                type="button"
                className="rev-btn rev-btn-primary"
                onClick={onApprove}
                disabled={pending}
              >
                Approve &amp; schedule
              </button>
              <p className="rev-hint">
                Tags become the creator’s revision checklist. Works the same
                when content type is Newsletter or Homepage later.
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
