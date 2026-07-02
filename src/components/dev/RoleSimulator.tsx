"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CAMPAIGN_ROLES,
  campaignRoleLabel,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import { setSimulatedRoleAction } from "@/lib/auth/actions";

interface RoleSimulatorProps {
  currentRole: CampaignRole;
  eventPath: string;
}

export function RoleSimulator({ currentRole, eventPath }: RoleSimulatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(role: CampaignRole) {
    startTransition(async () => {
      await setSimulatedRoleAction(role, eventPath);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-cos-border bg-cos-card/60 px-4 py-3 text-xs text-cos-muted">
      <span className="font-medium text-cos-text">Simulated role</span>
      <select
        className="rounded-lg border border-cos-border bg-cos-card px-2 py-1 text-sm text-cos-text"
        value={currentRole}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value as CampaignRole)}
        aria-label="Simulated role"
      >
        {CAMPAIGN_ROLES.map((role) => (
          <option key={role} value={role}>
            {campaignRoleLabel(role)}
          </option>
        ))}
      </select>
      <span>Switch roles to preview approval permissions.</span>
    </div>
  );
}
