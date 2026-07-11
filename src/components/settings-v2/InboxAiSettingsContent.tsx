"use client";

import { Plus } from "lucide-react";
import { InboxAiSourcesPanel } from "@/components/settings/InboxAiSourcesPanel";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
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
  const activePresetCount = presetSources.filter((source) => source.url?.trim()).length;
  const activeCustomCount = input.customSources.filter((source) => source.url.trim()).length;
  const totalActiveSources = activePresetCount + activeCustomCount;

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Inbox AI"
        description="Add sources with names, descriptions, and links so Hey Ralli can match inbox questions to the right page."
        actions={
          <Button href="#add-source" size="sm">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add source
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InboxAiSourcesPanel initialInput={input} presetSources={presetSources} />
        </div>

        <SettingsV2Card title="How Inbox AI Works">
          <div className="space-y-4 text-sm">
            <p className="leading-relaxed text-cos-muted">
              Hey Ralli matches incoming messages to your connected sources and drafts replies
              using your AI Brain voice.
            </p>
            <div className="rounded-md border border-cos-border bg-cos-bg px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                Health
              </p>
              <p className="mt-1 font-display text-2xl text-cos-text">
                {Math.min(totalActiveSources, 10)}/10
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                Last sync
              </p>
              <p className="mt-1 text-cos-text">Background sync active</p>
            </div>
          </div>
        </SettingsV2Card>
      </div>
    </div>
  );
}
