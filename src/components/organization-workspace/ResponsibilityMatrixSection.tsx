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
import { RESPONSIBILITY_LABELS } from "@/lib/organization-workspace/constants";
import { updateResponsibilityMatrixAction } from "@/lib/organization-workspace/actions";
import type {
  OrganizationRole,
  ResponsibilityMatrixEntry,
} from "@/types/organization-workspace";

interface ResponsibilityMatrixSectionProps {
  entries: ResponsibilityMatrixEntry[];
  roles: OrganizationRole[];
  showIntro?: boolean;
}

export function ResponsibilityMatrixSection({
  entries,
  roles,
  showIntro = true,
}: ResponsibilityMatrixSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(entryId: string, defaultRoleId: string) {
    startTransition(async () => {
      await updateResponsibilityMatrixAction(
        entryId,
        defaultRoleId || null,
      );
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Responsibility Matrix</CardTitle>
        {showIntro && (
          <CardDescription>
            Who usually handles each channel and function. CampaignOS will
            suggest these when building timelines.
          </CardDescription>
        )}
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-cos-border text-cos-muted">
              <th className="pb-3 pr-4 font-medium">Responsibility</th>
              <th className="pb-3 font-medium">Default role</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-cos-border">
                <td className="py-3 pr-4 font-medium text-cos-text">
                  {RESPONSIBILITY_LABELS[entry.responsibilityType]}
                </td>
                <td className="py-3">
                  <Select
                    name={`role-${entry.id}`}
                    defaultValue={entry.defaultRoleId ?? ""}
                    disabled={isPending}
                    onChange={(event) =>
                      handleRoleChange(entry.id, event.target.value)
                    }
                    aria-label={`Default role for ${RESPONSIBILITY_LABELS[entry.responsibilityType]}`}
                  >
                    <option value="">Not assigned</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
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
