"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { inviteTeamMemberAction } from "@/lib/auth/actions";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type { OrganizationRole } from "@/types/organization-workspace";

const SETUP_ROLE_HINTS = [
  "President",
  "VP Communications",
  "VP Events",
  "VP Fundraising",
  "Creative Chair",
];

interface TeamDraftRow {
  id: string;
  email: string;
  organizationRoleId: string;
  campaignRole: CampaignRole;
}

interface SchoolSetupTeamStepProps {
  roles: OrganizationRole[];
}

function emptyRow(): TeamDraftRow {
  return {
    id: crypto.randomUUID(),
    email: "",
    organizationRoleId: "",
    campaignRole: "contributor",
  };
}

export function SchoolSetupTeamStep({ roles }: SchoolSetupTeamStepProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TeamDraftRow[]>([emptyRow(), emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const suggestedRoles = roles.filter((role) =>
    SETUP_ROLE_HINTS.some(
      (hint) => role.name.toLowerCase() === hint.toLowerCase(),
    ),
  );
  const roleOptions = suggestedRoles.length > 0 ? suggestedRoles : roles.slice(0, 5);

  function updateRow(id: string, patch: Partial<TeamDraftRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [...current, emptyRow()]);
  }

  function handleSendInvites() {
    const invites = rows
      .map((row) => ({
        ...row,
        email: row.email.trim(),
      }))
      .filter((row) => row.email.length > 0);

    if (invites.length === 0) {
      setError(null);
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      let sent = 0;
      for (const invite of invites) {
        const formData = new FormData();
        formData.set("email", invite.email);
        if (invite.organizationRoleId) {
          formData.set("organizationRoleId", invite.organizationRoleId);
        }
        formData.set("campaignRole", invite.campaignRole);

        const result = await inviteTeamMemberAction(
          { error: null, success: false },
          formData,
        );

        if (result.error) {
          setError(result.error);
          return;
        }

        sent += 1;
      }

      setMessage(
        sent === 1
          ? "Invite created — share the link from Settings → Team when you are ready."
          : `${sent} invites created — share links from Settings → Team when you are ready.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border border-cos-border bg-cos-bg/40 px-5 py-4">
        <p className="font-display text-xl text-cos-text">Invite your board</p>
        <p className="mt-1 text-sm leading-relaxed text-cos-muted">
          Add VPs and committee chairs now, or skip and invite later from
          Settings → Team. Hey Ralli does not email invites automatically —
          you share the link after setup.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-4 border border-cos-border bg-cos-bg/30 p-4 sm:grid-cols-2"
          >
            <Input
              label={index === 0 ? "Email" : undefined}
              type="email"
              placeholder="vp.communications@ptoees.org"
              value={row.email}
              onChange={(event) =>
                updateRow(row.id, { email: event.target.value })
              }
              disabled={isPending}
            />
            <Select
              label={index === 0 ? "Organization role" : undefined}
              value={row.organizationRoleId}
              onChange={(event) =>
                updateRow(row.id, { organizationRoleId: event.target.value })
              }
              disabled={isPending}
            >
              <option value="">Select role (optional)</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <Select
              label={index === 0 ? "Access level" : undefined}
              value={row.campaignRole}
              onChange={(event) =>
                updateRow(row.id, {
                  campaignRole: event.target.value as CampaignRole,
                })
              }
              disabled={isPending}
              className="sm:col-span-2"
            >
              {CAMPAIGN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {campaignRoleLabel(role)}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          Add another person
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={handleSendInvites}
        >
          {isPending ? "Creating invites..." : "Create invite links"}
        </Button>
      </div>
    </div>
  );
}
