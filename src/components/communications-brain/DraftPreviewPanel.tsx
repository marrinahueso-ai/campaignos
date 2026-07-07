"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil, Sparkles } from "lucide-react";
import { DraftApprovalActions } from "@/components/event-workspace/DraftApprovalActions";
import { CommunicationStatusBadge } from "@/components/event-workspace/CommunicationStatusBadge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { updateStepDraftAction } from "@/lib/communications-brain/actions";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { formatEventDate } from "@/lib/utils/dates";
import type { StepCommunicationDraft } from "@/types/event-workspace";

interface DraftPreviewPanelProps {
  eventId: string;
  draft: StepCommunicationDraft;
  userRole: CampaignRole;
}

export function DraftPreviewPanel({ eventId, draft, userRole }: DraftPreviewPanelProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(draft.content);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(draft.content);
    setIsEditing(false);
    setError(null);
  }, [draft.communicationItemId, draft.content, draft.versionNumber]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateStepDraftAction(
        draft.communicationItemId,
        eventId,
        content,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-cos-border bg-cos-accent-soft/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-cos-text">
            <Sparkles className="h-4 w-4" />
            Draft Preview
          </p>
          <p className="mt-1 text-xs text-cos-muted">
            Drafted by Hey Ralli Assistant · Version {draft.versionNumber}
          </p>
        </div>
        <CommunicationStatusBadge status={draft.status} />
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-cos-muted">
            Channel
          </dt>
          <dd className="mt-0.5 font-medium text-cos-text">
            {CHANNEL_LABELS[draft.channel] ?? draft.channel}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-cos-muted">
            Timeline step
          </dt>
          <dd className="mt-0.5 font-medium text-cos-text">
            {draft.stepTitle}
            {draft.dueDate ? ` · ${formatEventDate(draft.dueDate)}` : ""}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        ) : (
          <div className="rounded-lg border border-white bg-white p-4 text-sm leading-7 whitespace-pre-wrap text-cos-text">
            {content}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <Button size="sm" disabled={isPending} onClick={handleSave}>
              Save edits
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                setContent(draft.content);
                setIsEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <DraftApprovalActions
              eventId={eventId}
              communicationItemId={draft.communicationItemId}
              status={draft.status}
              userRole={userRole}
            />
          </>
        )}
      </div>
    </div>
  );
}
