"use client";

import Link from "next/link";
import { PlaybookList } from "@/components/playbooks/PlaybookList";
import {
  SettingsEaseSectionChrome,
  settingsEasePrimaryBtnClassName,
} from "@/components/settings-v2/SettingsEaseSectionChrome";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface PlaybooksMilestonesContentProps {
  playbooks: CommunicationPlaybook[];
}

export function PlaybooksMilestonesContent({
  playbooks,
}: PlaybooksMilestonesContentProps) {
  return (
    <SettingsEaseSectionChrome
      data-settings-ease="playbook"
      title="Communication Plan"
      description="Create, duplicate, and manage countdown communication plans for every event type."
      backHref="/settings/branding"
      actions={
        <Link
          href="/settings/playbooks/new"
          className={settingsEasePrimaryBtnClassName}
        >
          Create communication plan
        </Link>
      }
    >
      <PlaybookList playbooks={playbooks} />
    </SettingsEaseSectionChrome>
  );
}
