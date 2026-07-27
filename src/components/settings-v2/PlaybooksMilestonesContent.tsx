"use client";

import Link from "next/link";
import { useState } from "react";
import { PlaybookList } from "@/components/playbooks/PlaybookList";
import {
  SettingsEaseSectionChrome,
  settingsEasePrimaryBtnClassName,
  settingsEaseSoftCardClassName,
} from "@/components/settings-v2/SettingsEaseSectionChrome";
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
    <SettingsEaseSectionChrome
      data-settings-ease="playbook"
      title="Playbook"
      description="Create, duplicate, and manage countdown communication plans for every event type."
      backHref="/settings/branding?section=playbook"
      actions={
        <Link
          href="/settings/playbooks/new"
          className={settingsEasePrimaryBtnClassName}
        >
          Create playbook
        </Link>
      }
    >
      <div
        className="mb-[18px] flex flex-wrap gap-2"
        role="tablist"
        aria-label="Playbook views"
      >
        {(
          [
            { id: "playbooks" as const, label: "Playbooks" },
            { id: "milestones" as const, label: "Milestones" },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full border-[1.5px] px-4 py-2 text-[13px] font-bold transition-transform duration-100 hover:-translate-y-px",
                active
                  ? "border-[#2f4a3c] bg-[#2f4a3c] text-[#f6f2eb]"
                  : "border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.7)] text-[#5c554c] hover:text-[#2a2622]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "playbooks" ? (
        <PlaybookList playbooks={playbooks} />
      ) : (
        <div className={settingsEaseSoftCardClassName}>
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Milestones
          </h3>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-[#5c554c]">
            Milestone templates are managed inside each campaign. Open a campaign
            to edit milestone schedules, or create a playbook above to define
            default countdown steps.
          </p>
          <Link
            href="/campaigns"
            className="mt-4 inline-flex text-[13px] font-bold text-[#2f4a3c] hover:text-[#2a2622]"
          >
            Browse campaigns →
          </Link>
        </div>
      )}
    </SettingsEaseSectionChrome>
  );
}
