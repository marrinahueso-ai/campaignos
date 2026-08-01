"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  RevisionArtworkPair,
  type RevisionArtScope,
} from "@/components/approvals-revision/RevisionArtworkPair";
import type { RevisionWorkspaceModel } from "@/components/approvals-revision/types";
import {
  regenerateRevisionArtworkAction,
  regenerateRevisionCaptionAction,
  updateRevisionScheduleAction,
} from "@/lib/approvals-revision/actions";
import { deriveAiInstructionsFromNote } from "@/lib/approvals-revision/revision-notes";
import { resubmitUnifiedApprovalAction } from "@/lib/approvals-scheduling/actions";
import { combineLocalDateAndTimeToIso } from "@/lib/utils/dates";

type ChecklistRow = RevisionWorkspaceModel["checklist"][number] & {
  done: boolean;
};

function initialChecklist(model: RevisionWorkspaceModel): ChecklistRow[] {
  return model.checklist.map((item) => ({ ...item, done: false }));
}

/**
 * Creator Revision card — layout matches approvals-revision-ai-regenerate-mockup.html.
 */
export function CreatorRevisionCard({
  model,
}: {
  model: RevisionWorkspaceModel;
}) {
  const router = useRouter();
  const [pendingResubmit, startResubmit] = useTransition();
  const [regeneratingArt, setRegeneratingArt] = useState<RevisionArtScope | null>(
    null,
  );
  const [regeneratingCaption, setRegeneratingCaption] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [aiInstructions, setAiInstructions] = useState(() =>
    deriveAiInstructionsFromNote(model.noteBody),
  );
  const originalCaption = model.captionText ?? "";
  const [captionText, setCaptionText] = useState(originalCaption);
  const [feedArtworkUrl, setFeedArtworkUrl] = useState(model.feedArtworkUrl);
  const [storyArtworkUrl, setStoryArtworkUrl] = useState(model.storyArtworkUrl);
  const [scheduleDate, setScheduleDate] = useState(
    model.scheduleDate ?? "",
  );
  const [scheduleTime, setScheduleTime] = useState(
    model.scheduleTime ?? "09:00",
  );
  const [scheduleAt, setScheduleAt] = useState(model.scheduleAt);
  const [scheduleLabel, setScheduleLabel] = useState(
    model.initialScheduleLabel ?? model.previewSubtitle,
  );
  const [artUpdated, setArtUpdated] = useState<RevisionArtScope | false>(false);
  const [artAnimating, setArtAnimating] = useState<RevisionArtScope | false>(
    false,
  );
  const [captionAnimating, setCaptionAnimating] = useState(false);

  const [checklist, setChecklist] = useState<ChecklistRow[]>(() =>
    initialChecklist(model),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const busy =
    pendingResubmit ||
    regeneratingArt !== null ||
    regeneratingCaption ||
    savingSchedule;

  const scheduleIso = useMemo(
    () => combineLocalDateAndTimeToIso(scheduleDate, scheduleTime),
    [scheduleDate, scheduleTime],
  );

  function markChecklistDone(id: string, detail?: string) {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              done: true,
              detail: detail ?? item.detail,
            }
          : item,
      ),
    );
  }

  function resetInstructionsFromNote() {
    setAiInstructions(deriveAiInstructionsFromNote(model.noteBody));
    setMessage("Instructions reset from approver note");
    setError(null);
  }

  async function onRegenerateArtwork(view: RevisionArtScope) {
    if (model.isDemo) {
      setRegeneratingArt(view);
      setArtAnimating(view);
      setMessage(
        view === "both"
          ? "Demo — would spend AI credits to regenerate feed + story."
          : `Demo — would spend AI credits to regenerate ${view} artwork.`,
      );
      window.setTimeout(() => {
        setArtUpdated(view);
        markChecklistDone("artwork", "Regenerated from AI instructions");
        markChecklistDone("art", "Regenerated from AI instructions");
        setRegeneratingArt(null);
        window.setTimeout(() => setArtAnimating(false), 1200);
      }, 1100);
      return;
    }

    if (!model.schedulingItemId || !model.campaignMilestoneId) {
      setError("This item can't be regenerated from here yet.");
      return;
    }

    setRegeneratingArt(view);
    setArtAnimating(view);
    setError(null);
    setMessage(null);

    const result = await regenerateRevisionArtworkAction({
      eventId: model.eventId,
      campaignMilestoneId: model.campaignMilestoneId,
      schedulingItemId: model.schedulingItemId,
      instructions: aiInstructions,
      view,
    });

    setRegeneratingArt(null);
    window.setTimeout(() => setArtAnimating(false), 1200);

    if (!result.success) {
      setError(result.error ?? "Couldn't regenerate artwork.");
      return;
    }

    // Action always returns both URLs after persist so resubmit stays in sync.
    if (result.feedArtworkUrl !== undefined) {
      setFeedArtworkUrl(result.feedArtworkUrl);
    }
    if (result.storyArtworkUrl !== undefined) {
      setStoryArtworkUrl(result.storyArtworkUrl);
    }
    setArtUpdated(view);
    markChecklistDone("artwork", "Regenerated from AI instructions");
    markChecklistDone("art", "Regenerated from AI instructions");
    setMessage(result.message ?? "Artwork regenerated.");
  }

  async function onRegenerateCaption() {
    if (model.isDemo) {
      setRegeneratingCaption(true);
      setCaptionAnimating(true);
      setMessage("Demo — would regenerate caption from instructions.");
      window.setTimeout(() => {
        setCaptionText(
          "Join us for Fall Festival on August 12! Warm vibes, big logo energy — volunteers welcome. Sign up today →",
        );
        markChecklistDone("caption", "Caption regenerated to match Aug 12");
        setRegeneratingCaption(false);
        window.setTimeout(() => setCaptionAnimating(false), 900);
      }, 900);
      return;
    }

    if (!model.schedulingItemId || !model.campaignMilestoneId) {
      setError("This item can't be regenerated from here yet.");
      return;
    }

    setRegeneratingCaption(true);
    setCaptionAnimating(true);
    setError(null);
    setMessage(null);

    const result = await regenerateRevisionCaptionAction({
      eventId: model.eventId,
      campaignMilestoneId: model.campaignMilestoneId,
      schedulingItemId: model.schedulingItemId,
      instructions: aiInstructions,
    });

    setRegeneratingCaption(false);
    window.setTimeout(() => setCaptionAnimating(false), 900);

    if (!result.success) {
      setError(result.error ?? "Couldn't regenerate caption.");
      return;
    }

    if (result.captionText) {
      setCaptionText(result.captionText);
    }
    markChecklistDone(
      "caption",
      scheduleLabel
        ? `Caption regenerated to match ${scheduleLabel}`
        : "Caption regenerated from AI instructions",
    );
    setMessage(result.message ?? "Caption regenerated.");
  }

  async function onScheduleBlur() {
    if (model.isDemo || !scheduleDate) {
      return;
    }
    if (!model.schedulingItemId || !model.campaignMilestoneId) {
      return;
    }

    setSavingSchedule(true);
    setError(null);

    const result = await updateRevisionScheduleAction({
      eventId: model.eventId,
      campaignMilestoneId: model.campaignMilestoneId,
      schedulingItemId: model.schedulingItemId,
      scheduleDate,
      scheduleTime,
    });

    setSavingSchedule(false);

    if (!result.success) {
      setError(result.error ?? "Couldn't update schedule.");
      return;
    }

    if (result.scheduleAt) {
      setScheduleAt(result.scheduleAt);
    }
    if (result.scheduleLabel) {
      setScheduleLabel(result.scheduleLabel);
    }
    const detail = model.initialScheduleLabel
      ? `${model.initialScheduleLabel} → ${result.scheduleLabel ?? scheduleDate}`
      : (result.scheduleLabel ?? "Schedule updated on artwork / publish time");
    markChecklistDone("date", detail);
    setMessage(result.message ?? "Schedule updated.");
  }

  function onResubmit() {
    if (model.isDemo) {
      setMessage(
        "Demo fixture — open a real Changes item from Approvals to resubmit.",
      );
      return;
    }
    if (!model.schedulingItemId) {
      setError(
        "This item can't be resubmitted from here yet. Open Create with AI Preview to send for re-approval.",
      );
      return;
    }

    setError(null);
    startResubmit(async () => {
      const result = await resubmitUnifiedApprovalAction({
        eventId: model.eventId,
        schedulingItemId: model.schedulingItemId!,
        campaignName: model.campaignName,
        milestoneName: model.milestoneName,
        feedArtworkUrl,
        storyArtworkUrl,
        captionText: captionText.trim() || null,
        storyCaption: captionText.trim() || null,
        scheduleAt: scheduleAt ?? scheduleIso,
      });
      if (!result.success) {
        setError(result.error ?? "Couldn't send for re-approval. Try again.");
        return;
      }
      router.push("/approvals");
      router.refresh();
    });
  }

  function artButtonLabel(view: RevisionArtScope, idle: string) {
    if (regeneratingArt === view) return "✦ Generating…";
    return idle;
  }

  function toggleChecklist(id: string) {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  const isFlyer = model.contentType === "flyer";

  return (
    <div className="rev-shell">
      <Link href={model.backHref} className="rev-back">
        ← Back to Approvals
      </Link>

      <div className="rev-meta-row">
        <span className="rev-type-chip">{model.typeChip}</span>
        <span
          className={
            model.statusKind === "changes"
              ? "rev-status-chip"
              : "rev-status-chip is-review"
          }
        >
          {model.statusChip}
        </span>
        <span className="rev-meta-title">{model.contextLine}</span>
      </div>

      <h1>{model.title}</h1>
      <p className="rev-lede">
        {isFlyer
          ? "Fix what your reviewer asked for in Flyer composer, then send it back for a final check."
          : "Fix what your reviewer asked for, then send it back for a final check."}
      </p>

      <div className="rev-creator-grid">
        <div className="rev-creator-main">
          <div className="rev-panel">
            <div className="rev-label">Preview</div>
            <RevisionArtworkPair
              variant={isFlyer ? "flyer" : "social"}
              feedUrl={feedArtworkUrl}
              storyUrl={isFlyer ? null : storyArtworkUrl}
              title={model.previewTitle}
              subtitle={scheduleLabel || model.previewSubtitle}
              artUpdated={isFlyer ? false : artUpdated}
              animating={isFlyer ? false : artAnimating}
              showEditHints
            />
          </div>

          <div className="rev-panel">
            <div className="rev-caption-head">
              <div className="rev-label">
                {isFlyer ? "On-flyer copy" : "Caption"}
              </div>
              {!isFlyer && originalCaption ? (
                <button
                  type="button"
                  className="rev-text-link"
                  onClick={() => setCaptionText(originalCaption)}
                  disabled={busy || captionText === originalCaption}
                >
                  Restore original
                </button>
              ) : null}
            </div>
            <textarea
              className={`rev-caption-input${captionAnimating ? " is-regen" : ""}`}
              aria-label={isFlyer ? "On-flyer copy" : "Caption"}
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              rows={4}
              disabled={busy}
            />
          </div>

          {!isFlyer ? (
            <div className="rev-panel">
              <div className="rev-label">Schedule</div>
              <div className="rev-schedule-row">
                <input
                  type="date"
                  className="rev-schedule-input"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  onBlur={onScheduleBlur}
                  disabled={busy || model.isDemo}
                  aria-label="Schedule date"
                />
                <input
                  type="time"
                  className="rev-schedule-input"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  onBlur={onScheduleBlur}
                  disabled={busy || model.isDemo}
                  aria-label="Schedule time"
                />
              </div>
              {savingSchedule ? (
                <p className="rev-ai-hint">Saving schedule…</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rev-creator-side">
          <div className="rev-ask-panel">
            <div className="rev-label">What they asked for</div>
            <div className="rev-note-who">{model.noteWho}</div>
            <p className="rev-ask-note">{model.noteBody}</p>
            {checklist.length > 0 ? (
              <ul className="rev-checklist">
                {checklist.map((item) => (
                  <li key={item.id} className={item.done ? "is-done" : undefined}>
                    <button
                      type="button"
                      className="rev-check"
                      aria-pressed={item.done}
                      aria-label={`${item.done ? "Unmark" : "Mark"} ${item.title}`}
                      onClick={() => toggleChecklist(item.id)}
                    >
                      {item.done ? "✓" : ""}
                    </button>
                    <div className="rev-check-body">
                      <strong>
                        {item.title}
                        {item.detail ? ` — ${item.detail}` : ""}
                      </strong>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {isFlyer ? (
            <div className="rev-ai-panel">
              <div className="rev-label">Revise in Flyer</div>
              <p className="rev-ai-hint" style={{ marginTop: 0 }}>
                Print flyers edit in Flyer composer (letter layout, QR, and
                copy). Come back here when the artwork is ready to resubmit.
              </p>
              <div className="rev-ai-actions">
                {model.editArtworkHref ? (
                  <Link
                    href={model.editArtworkHref}
                    className="rev-btn rev-btn-ai"
                  >
                    Open Flyer composer
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rev-ai-panel">
              <div className="rev-label">Instruct AI (from their note)</div>
              <textarea
                className="rev-ai-textarea"
                aria-label="AI instructions"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                rows={4}
                disabled={busy}
              />
              <div className="rev-ai-actions">
                <button
                  type="button"
                  className="rev-btn rev-btn-ai"
                  onClick={() => onRegenerateArtwork("feed")}
                  disabled={busy}
                >
                  {artButtonLabel("feed", "✦ Regenerate feed (1:1)")}
                </button>
                <button
                  type="button"
                  className="rev-btn rev-btn-ai"
                  onClick={() => onRegenerateArtwork("story")}
                  disabled={busy}
                >
                  {artButtonLabel("story", "✦ Regenerate story (9:16)")}
                </button>
                <button
                  type="button"
                  className="rev-btn rev-btn-ai"
                  onClick={() => onRegenerateArtwork("both")}
                  disabled={busy}
                >
                  {artButtonLabel("both", "✦ Regenerate both")}
                </button>
                <button
                  type="button"
                  className="rev-btn rev-btn-ai"
                  onClick={onRegenerateCaption}
                  disabled={busy}
                >
                  {regeneratingCaption ? "✦ Writing…" : "✦ Regenerate caption"}
                </button>
              </div>
            </div>
          )}

          <div className="rev-actions rev-actions-stack">
            <button
              type="button"
              className="rev-btn rev-btn-primary rev-btn-block"
              onClick={onResubmit}
              disabled={busy}
            >
              {pendingResubmit ? "Sending…" : "Send for re-approval"}
            </button>
            {!isFlyer ? (
              <button
                type="button"
                className="rev-text-link"
                onClick={resetInstructionsFromNote}
                disabled={busy}
              >
                Reset to original note
              </button>
            ) : null}
            <Link href={model.backHref} className="rev-text-link">
              Cancel
            </Link>
            <p className="rev-hint">
              {isFlyer
                ? "After Flyer composer looks right → Send for re-approval."
                : "After AI updates look right → Send for re-approval."}
            </p>
            {error ? (
              <p className="rev-hint rev-error" role="alert">
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
  );
}
