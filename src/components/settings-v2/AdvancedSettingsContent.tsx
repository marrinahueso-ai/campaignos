"use client";

import { useState } from "react";
import { DeveloperClearCampaignPanel } from "@/components/dev-tools/DeveloperClearCampaignPanel";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AdvancedSettingsContentProps {
  organizationId: string;
  campaigns: Array<{ id: string; title: string }>;
}

export function AdvancedSettingsContent({
  organizationId,
  campaigns,
}: AdvancedSettingsContentProps) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === "DELETE";

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Advanced"
        description="Export data, security options, and workspace-level actions."
      />

      {organizationId ? (
        <DeveloperClearCampaignPanel
          organizationId={organizationId}
          campaigns={campaigns}
        />
      ) : null}

      <SettingsV2Card
        title="Export data"
        description="Download a copy of your organization data, playbooks, and settings."
      >
        <Button variant="secondary">Export workspace data</Button>
      </SettingsV2Card>

      <SettingsV2Card
        title="Security"
        description="Session and access controls for your workspace."
      >
        <ul className="space-y-3 text-sm text-cos-muted">
          <li>Two-factor authentication — coming soon</li>
          <li>Session timeout — 30 days (default)</li>
          <li>API access — not enabled</li>
        </ul>
      </SettingsV2Card>

      <SettingsV2Card
        title="System status"
        description="Background jobs and integration health."
      >
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-cos-muted">Inbox sync</span>
            <span className="font-medium text-emerald-700">Operational</span>
          </li>
          <li className="flex justify-between">
            <span className="text-cos-muted">Meta publishing</span>
            <span className="font-medium text-emerald-700">Operational</span>
          </li>
          <li className="flex justify-between">
            <span className="text-cos-muted">Auto-backup</span>
            <span className="font-medium text-emerald-700">Active</span>
          </li>
        </ul>
      </SettingsV2Card>

      <SettingsV2Card
        title="Danger zone"
        description="Permanently delete your workspace and all associated data."
      >
        <p className="text-sm text-cos-muted">
          Type <strong className="text-cos-text">DELETE</strong> to confirm.
        </p>
        <Input
          className="mt-4"
          label="Confirmation"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
        />
        <Button className="mt-4" variant="danger" disabled={!canDelete}>
          Delete workspace
        </Button>
      </SettingsV2Card>
    </div>
  );
}
