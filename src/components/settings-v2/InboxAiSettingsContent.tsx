"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { InboxAiSourcesPanel } from "@/components/settings/InboxAiSourcesPanel";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { InboxAiSourcesSettingsInput } from "@/types/inbox-ai-sources";

interface InboxAiSettingsContentProps {
  input: InboxAiSourcesSettingsInput;
  presetSources: Array<{ label: string; url: string | null; type: string }>;
}

export function InboxAiSettingsContent({
  input,
  presetSources,
}: InboxAiSettingsContentProps) {
  const allSources = [
    ...presetSources.filter((source) => source.url),
    ...input.customSources.map((source) => ({
      label: source.label,
      url: source.url,
      type: "Custom link",
    })),
  ];

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
        <div className="space-y-6 lg:col-span-2">
          <SettingsV2Card title="Connected Sources">
            {allSources.length === 0 ? (
              <p className="text-sm text-cos-muted">No sources configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
                      <th className="py-2 pr-4 font-medium">Source</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSources.map((source) => (
                      <tr key={`${source.label}-${source.url}`} className="border-b border-cos-border last:border-b-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-cos-text">{source.label}</p>
                          {source.url ? (
                            <Link
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cos-muted hover:text-cos-text"
                            >
                              {source.url}
                            </Link>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 text-cos-muted">{source.type}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="success">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SettingsV2Card>

          <div id="add-source">
            <InboxAiSourcesPanel initialInput={input} />
          </div>
        </div>

        <SettingsV2Card title="How Inbox AI Works">
          <div className="space-y-4 text-sm">
            <p className="leading-relaxed text-cos-muted">
              Hey Ralli matches incoming messages to your connected sources and
              drafts replies using your AI Brain voice.
            </p>
            <div className="rounded-md border border-cos-border bg-cos-bg px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                Health
              </p>
              <p className="mt-1 font-display text-2xl text-cos-text">
                {Math.min(allSources.length, 10)}/10
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
