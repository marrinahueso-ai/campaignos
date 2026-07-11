"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Archive,
  Copy,
  Edit,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  archivePlaybookAction,
  deletePlaybookAction,
  duplicatePlaybookAction,
} from "@/lib/playbooks/actions";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import type { CommunicationPlaybook } from "@/types/playbooks";

const SYSTEM_PLAYBOOK_DELETE_TOOLTIP =
  "System playbooks cannot be deleted. Duplicate to create your own copy.";

interface PlaybookListProps {
  playbooks: CommunicationPlaybook[];
}

export function PlaybookList({ playbooks }: PlaybookListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const visiblePlaybooks = playbooks.filter(
    (playbook) => !deletedIds.includes(playbook.id),
  );

  if (visiblePlaybooks.length === 0) {
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
    setError(null);
    startTransition(async () => {
      const result = await duplicatePlaybookAction(playbookId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.playbookId) {
        router.push(`/settings/playbooks/${result.playbookId}`);
      }
    });
  }

  function handleArchive(playbookId: string, playbookName: string) {
    const confirmed = window.confirm(
      `Archive "${playbookName}"?\n\nIt will be hidden from this list but existing event assignments are unchanged.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await archivePlaybookAction(playbookId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeletedIds((current) => [...current, playbookId]);
      router.refresh();
    });
  }

  function handleDelete(playbook: CommunicationPlaybook) {
    const confirmed = window.confirm(
      `Permanently delete "${playbook.name}"?\n\nThis removes the playbook and its steps. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deletePlaybookAction(playbook.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeletedIds((current) => [...current, playbook.id]);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {visiblePlaybooks.map((playbook) => (
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
                  onClick={() => handleArchive(playbook.id, playbook.name)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive
                </Button>
              )}
              {playbook.isSystem ? (
                <span title={SYSTEM_PLAYBOOK_DELETE_TOOLTIP}>
                  <Button variant="secondary" size="sm" disabled>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(playbook)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
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
