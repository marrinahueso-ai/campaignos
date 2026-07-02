"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Archive,
  Copy,
  Edit,
  Layers,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  archivePlaybookAction,
  duplicatePlaybookAction,
} from "@/lib/playbooks/actions";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface PlaybookListProps {
  playbooks: CommunicationPlaybook[];
}

export function PlaybookList({ playbooks }: PlaybookListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (playbooks.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No playbooks yet"
        description="Create your first communication playbook to define countdown schedules for events."
        action={{ label: "Create playbook", href: "/settings/playbooks/new" }}
      />
    );
  }

  function handleDuplicate(playbookId: string) {
    startTransition(async () => {
      const result = await duplicatePlaybookAction(playbookId);
      if (result.playbookId) {
        router.push(`/settings/playbooks/${result.playbookId}`);
      }
    });
  }

  function handleArchive(playbookId: string) {
    startTransition(async () => {
      await archivePlaybookAction(playbookId);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {playbooks.map((playbook) => (
        <Card key={playbook.id} padding="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-cos-text">
                  {playbook.name}
                </h3>
                {playbook.isSystem && <Badge variant="info">System</Badge>}
              </div>
              {playbook.description && (
                <p className="text-sm text-cos-muted">{playbook.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-cos-muted">
                <span>{EVENT_TYPE_LABELS[playbook.eventType]}</span>
                <span>·</span>
                <span>{playbook.stepCount ?? 0} steps</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                href={`/settings/playbooks/${playbook.id}`}
                variant="secondary"
                size="sm"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
                onClick={() => handleDuplicate(playbook.id)}
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </Button>
              {!playbook.isSystem && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleArchive(playbook.id)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      <Button href="/settings/playbooks/new" className="w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        Create Playbook
      </Button>
    </div>
  );
}
