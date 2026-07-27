"use client";

import Link from "next/link";
import { InboxAiSourcesPanel } from "@/components/settings/InboxAiSourcesPanel";
import {
  SettingsEaseSectionChrome,
  settingsEasePrimaryBtnClassName,
  settingsEaseSoftCardClassName,
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
  const activePresetCount = presetSources.filter((source) =>
    source.url?.trim(),
  ).length;
  const activeCustomCount = input.customSources.filter((source) =>
    source.url.trim(),
  ).length;
  const totalActiveSources = activePresetCount + activeCustomCount;

  return (
    <SettingsEaseSectionChrome
      data-settings-ease="ai-inbox"
      title="AI Inbox"
      description="Add sources with names, descriptions, and links so Hey Ralli can match inbox questions to the right page."
      backHref="/settings/branding?section=ai-inbox"
      actions={
        <Link href="#add-source" className={settingsEasePrimaryBtnClassName}>
          Add source
        </Link>
      }
    >
      <div className="grid gap-3.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InboxAiSourcesPanel
            initialInput={input}
            presetSources={presetSources}
          />
        </div>

        <div className={settingsEaseSoftCardClassName}>
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            How Inbox AI Works
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5c554c]">
            Hey Ralli matches incoming messages to your connected sources and
            drafts replies using your AI Brain voice.
          </p>
          <div className="mt-4 rounded-[14px] border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] px-3.5 py-3">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7a7166]">
              Health
            </p>
            <p
              className="mt-1 mb-0 text-[22px] font-semibold text-[#2a2622]"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {Math.min(totalActiveSources, 10)}/10
            </p>
          </div>
          <div className="mt-4">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#7a7166]">
              Last sync
            </p>
            <p className="mt-1 mb-0 text-sm font-semibold text-[#2a2622]">
              Background sync active
            </p>
          </div>
        </div>
      </div>
    </SettingsEaseSectionChrome>
  );
}
