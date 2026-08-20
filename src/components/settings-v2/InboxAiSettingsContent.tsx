"use client";

import Link from "next/link";
import { InboxAiSourcesPanel } from "@/components/settings/InboxAiSourcesPanel";
import {
  SettingsEaseSectionChrome,
  settingsEasePrimaryBtnClassName,
} from "@/components/settings-v2/SettingsEaseSectionChrome";
import type { InboxAiPresetSourceDisplay } from "@/lib/organizations/inbox-ai-sources/preset-sources";
import type { InboxAiSourcesSettingsInput } from "@/types/inbox-ai-sources";

interface InboxAiSettingsContentProps {
  input: InboxAiSourcesSettingsInput;
  presetSources: InboxAiPresetSourceDisplay[];
}

export function InboxAiSettingsContent({
  input,
  presetSources,
}: InboxAiSettingsContentProps) {
  return (
    <SettingsEaseSectionChrome
      data-settings-ease="ai-inbox"
      title="AI Inbox"
      description="Add sources with names, descriptions, and links so Hey Ralli can match inbox questions to the right page."
      backHref="/settings/branding"
      actions={
        <Link href="#add-source" className={settingsEasePrimaryBtnClassName}>
          Add source
        </Link>
      }
    >
      <InboxAiSourcesPanel
        initialInput={input}
        presetSources={presetSources}
      />
    </SettingsEaseSectionChrome>
  );
}
