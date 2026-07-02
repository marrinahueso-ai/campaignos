"use client";

import { useTransition } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { assignPlaybookToEventAction } from "@/lib/playbooks/actions";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import type { CommunicationPlaybook, EventPlaybookData } from "@/types/playbooks";

interface AssignedPlaybookSectionProps {
  eventId: string;
  playbookData: EventPlaybookData;
  availablePlaybooks: CommunicationPlaybook[];
}

export function AssignedPlaybookSection({
  eventId,
  playbookData,
  availablePlaybooks,
}: AssignedPlaybookSectionProps) {
  const [isPending, startTransition] = useTransition();
  const { playbook, steps } = playbookData;

  function handlePlaybookChange(playbookId: string) {
    if (playbookId === playbook.id) return;

    startTransition(async () => {
      await assignPlaybookToEventAction(eventId, playbookId);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cos-primary" />
              Communication plan
            </CardTitle>
            <CardDescription>
              The timing and channels this event follows.
            </CardDescription>
          </div>
          <Badge variant="info">{EVENT_TYPE_LABELS[playbook.eventType]}</Badge>
        </div>
      </CardHeader>

      <div className="space-y-4">
        <div className="rounded-xl border border-cos-border bg-cos-bg/60 p-4">
          <p className="text-lg font-semibold text-cos-text">{playbook.name}</p>
          {playbook.description && (
            <p className="mt-1 text-sm leading-relaxed text-cos-muted">
              {playbook.description}
            </p>
          )}
          <p className="mt-3 text-sm text-cos-muted">
            {steps.length} communication{steps.length === 1 ? "" : "s"} on the timeline
          </p>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-cos-text">
            <ChevronDown className="h-4 w-4 text-cos-muted" />
            Change plan
          </label>
          <Select
            value={playbook.id}
            onChange={(event) => handlePlaybookChange(event.target.value)}
            disabled={isPending}
          >
            {availablePlaybooks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.stepCount ?? 0} steps)
              </option>
            ))}
          </Select>
          {isPending && (
            <p className="mt-2 text-xs text-cos-muted">Updating your plan…</p>
          )}
        </div>
      </div>
    </Card>
  );
}
