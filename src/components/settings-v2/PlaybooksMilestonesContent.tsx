"use client";

import Link from "next/link";
import { useState } from "react";
import { PlaybookList } from "@/components/playbooks/PlaybookList";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface PlaybooksMilestonesContentProps {
  playbooks: CommunicationPlaybook[];
}

type TabId = "playbooks" | "milestones";

export function PlaybooksMilestonesContent({
  playbooks,
}: PlaybooksMilestonesContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>("playbooks");

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Playbooks / Milestones"
        description="Create, duplicate, and manage countdown communication plans for every event type."
        actions={
          <Button href="/settings/playbooks/new" size="sm">
            Create Playbook
          </Button>
        }
      />

      <div className="flex gap-1 border-b border-cos-border">
        {(
          [
            { id: "playbooks" as const, label: "Playbooks" },
            { id: "milestones" as const, label: "Milestones" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm transition-colors",
              activeTab === tab.id
                ? "border-cos-primary font-medium text-cos-text"
                : "border-transparent text-cos-muted hover:text-cos-text",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "playbooks" ? (
        <PlaybookList playbooks={playbooks} />
      ) : (
        <SettingsV2Card title="Milestones">
          <p className="text-sm leading-relaxed text-cos-muted">
            Milestone templates are managed inside each campaign. Open a campaign
            to edit milestone schedules, or create a playbook above to define
            default countdown steps.
          </p>
          <Link
            href="/campaigns"
            className="mt-4 inline-flex text-sm font-medium text-cos-text hover:text-cos-primary"
          >
            Browse campaigns →
          </Link>
        </SettingsV2Card>
      )}
    </div>
  );
}
