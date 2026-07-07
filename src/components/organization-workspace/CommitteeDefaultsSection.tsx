"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
import {
  COMMITTEE_LABELS,
  PLAYBOOK_SLUG_OPTIONS,
} from "@/lib/organization-workspace/constants";
import { updateCommitteeDefaultAction } from "@/lib/organization-workspace/actions";
import type {
  CommitteeDefault,
  OrganizationRole,
} from "@/types/organization-workspace";
import type { CommunicationStrategy } from "@/types/communication-strategy";

interface CommitteeDefaultsSectionProps {
  entries: CommitteeDefault[];
  roles: OrganizationRole[];
  showIntro?: boolean;
}

export function CommitteeDefaultsSection({
  entries,
  roles,
  showIntro = true,
}: CommitteeDefaultsSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOwnerChange(entryId: string, defaultRoleId: string) {
    startTransition(async () => {
      await updateCommitteeDefaultAction(entryId, {
        defaultRoleId: defaultRoleId || null,
      });
      router.refresh();
    });
  }

  function handleStrategyChange(entryId: string, strategy: string) {
    startTransition(async () => {
      await updateCommitteeDefaultAction(entryId, {
        communicationStrategy: strategy as CommunicationStrategy,
      });
      router.refresh();
    });
  }

  function handlePlaybookChange(entryId: string, playbookSlug: string) {
    startTransition(async () => {
      await updateCommitteeDefaultAction(entryId, {
        playbookSlug: playbookSlug || null,
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Committee Ownership</CardTitle>
        {showIntro && (
          <CardDescription>
            When Hey Ralli sees an event on your calendar, it already knows
            who usually runs it and how much communication it needs.
          </CardDescription>
        )}
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-cos-border text-cos-muted">
              <th className="pb-3 pr-4 font-medium">Committee</th>
              <th className="pb-3 pr-4 font-medium">Committee owner</th>
              <th className="pb-3 pr-4 font-medium">Communication strategy</th>
              <th className="pb-3 font-medium">Playbook</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-cos-border">
                <td className="py-3 pr-4 font-medium text-cos-text">
                  {COMMITTEE_LABELS[entry.committeeName]}
                </td>
                <td className="py-3 pr-4">
                  <Select
                    name={`owner-${entry.id}`}
                    defaultValue={entry.defaultRoleId ?? ""}
                    disabled={isPending}
                    onChange={(event) =>
                      handleOwnerChange(entry.id, event.target.value)
                    }
                    aria-label={`Owner for ${COMMITTEE_LABELS[entry.committeeName]}`}
                  >
                    <option value="">Not assigned</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-3 pr-4">
                  <Select
                    name={`strategy-${entry.id}`}
                    defaultValue={entry.communicationStrategy}
                    disabled={isPending}
                    onChange={(event) =>
                      handleStrategyChange(entry.id, event.target.value)
                    }
                    aria-label={`Strategy for ${COMMITTEE_LABELS[entry.committeeName]}`}
                  >
                    {COMMUNICATION_STRATEGY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-3">
                  <Select
                    name={`playbook-${entry.id}`}
                    defaultValue={entry.playbookSlug ?? ""}
                    disabled={isPending}
                    onChange={(event) =>
                      handlePlaybookChange(entry.id, event.target.value)
                    }
                    aria-label={`Playbook for ${COMMITTEE_LABELS[entry.committeeName]}`}
                  >
                    <option value="">None</option>
                    {PLAYBOOK_SLUG_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
