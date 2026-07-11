"use client";

import {
  FormEvent,
  useActionState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  saveInboxAiSourcesAction,
  type InboxAiSourcesActionState,
} from "@/lib/organizations/inbox-ai-sources/actions";
import type { InboxAiPresetSourceDisplay } from "@/lib/organizations/inbox-ai-sources/preset-sources";
import type { InboxAiSourcesSettingsInput } from "@/types/inbox-ai-sources";
import { cn } from "@/lib/utils/cn";

const INITIAL_STATE: InboxAiSourcesActionState = {
  error: null,
  success: false,
};

interface InboxAiSourcesPanelProps {
  initialInput: InboxAiSourcesSettingsInput;
  presetSources: InboxAiPresetSourceDisplay[];
}

function serializeCustomSources(
  customSources: InboxAiSourcesSettingsInput["customSources"],
): string {
  return JSON.stringify(
    customSources.map((source) => ({
      id: source.id,
      label: source.label,
      url: source.url,
      description: source.description ?? "",
    })),
  );
}

function customRowKey(source: InboxAiSourcesSettingsInput["customSources"][number], index: number) {
  return source.id ?? `custom-${index}`;
}

export function InboxAiSourcesPanel({
  initialInput,
  presetSources,
}: InboxAiSourcesPanelProps) {
  const router = useRouter();
  const [customSources, setCustomSources] = useState(initialInput.customSources);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(new Set());
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    serializeCustomSources(initialInput.customSources),
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    saveInboxAiSourcesAction,
    INITIAL_STATE,
  );

  const activePresetSources = useMemo(
    () => presetSources.filter((source) => source.url?.trim()),
    [presetSources],
  );

  const currentSnapshot = useMemo(
    () => serializeCustomSources(customSources),
    [customSources],
  );
  const hasUnsavedCustomSources = lastSavedSnapshot !== currentSnapshot;
  const totalActiveSources = activePresetSources.length + customSources.filter((source) => source.url.trim()).length;

  useLayoutEffect(() => {
    if (!state.success || !state.savedCustomSources) {
      return;
    }

    setCustomSources(state.savedCustomSources);
    setLastSavedSnapshot(serializeCustomSources(state.savedCustomSources));
    router.refresh();
  }, [state.success, state.savedCustomSources, router]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedCustomSources) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedCustomSources]);

  function toggleExpanded(rowKey: string) {
    setExpandedRowKeys((current) => {
      const next = new Set(current);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }

  function addCustomSource() {
    setClientError(null);
    const nextIndex = customSources.length;
    setCustomSources((current) => [...current, { label: "", url: "", description: "" }]);
    setExpandedRowKeys((current) => new Set(current).add(`custom-${nextIndex}`));
  }

  function removeCustomSource(index: number) {
    setClientError(null);
    const rowKey = customRowKey(customSources[index], index);
    setCustomSources((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setExpandedRowKeys((current) => {
      const next = new Set(current);
      next.delete(rowKey);
      return next;
    });
  }

  function updateCustomSource(
    index: number,
    field: "label" | "url" | "description",
    value: string,
  ) {
    setClientError(null);
    setCustomSources((current) =>
      current.map((source, itemIndex) =>
        itemIndex === index ? { ...source, [field]: value } : source,
      ),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    for (const source of customSources) {
      const hasLabel = source.label.trim().length > 0;
      const hasUrl = source.url.trim().length > 0;

      if (hasUrl && !hasLabel) {
        event.preventDefault();
        setClientError("Each custom source needs a label.");
        return;
      }

      if (hasLabel && !hasUrl) {
        event.preventDefault();
        setClientError("Each custom source needs a URL.");
        return;
      }
    }

    setClientError(null);
  }

  const displayError = clientError ?? state.error;
  const showSuccessMessage = state.success && !hasUnsavedCustomSources;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input
        type="hidden"
        name="customSourcesJson"
        value={serializeCustomSources(customSources)}
        readOnly
      />

      <div className="cos-card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cos-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg text-cos-text">Connected Sources</h2>
            <p className="mt-1 text-sm text-cos-muted">
              Add pages and tools parents ask about. Expand a row to edit details or add a
              description for AI matching.
            </p>
          </div>
          <Button
            id="add-source"
            type="button"
            size="sm"
            variant="secondary"
            onClick={addCustomSource}
          >
            <Plus className="h-3.5 w-3.5" />
            Add source
          </Button>
        </div>

        {totalActiveSources === 0 && customSources.length === 0 ? (
          <p className="px-5 py-6 text-sm text-cos-muted">
            No sources configured yet. Add a custom source or complete School Setup with
            organization URLs.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-cos-border text-xs uppercase tracking-wide text-cos-muted">
                  <th className="w-10 py-2 pl-3 pr-1 font-medium" aria-hidden />
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="w-12 py-2 pr-3 font-medium" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {activePresetSources.map((source) => {
                  const rowKey = `preset:${source.label}`;
                  const isExpanded = expandedRowKeys.has(rowKey);

                  return (
                    <PresetSourceRow
                      key={rowKey}
                      source={source}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpanded(rowKey)}
                    />
                  );
                })}

                {customSources.map((source, index) => {
                  const rowKey = customRowKey(source, index);
                  const isExpanded = expandedRowKeys.has(rowKey);
                  const hasUrl = source.url.trim().length > 0;
                  const hasDescription = (source.description ?? "").trim().length > 0;

                  return (
                    <CustomSourceRow
                      key={rowKey}
                      source={source}
                      index={index}
                      isExpanded={isExpanded}
                      hasUrl={hasUrl}
                      hasDescription={hasDescription}
                      onToggle={() => toggleExpanded(rowKey)}
                      onRemove={() => removeCustomSource(index)}
                      onUpdate={(field, value) => updateCustomSource(index, field, value)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-3 border-t border-cos-border px-5 py-4">
          {hasUnsavedCustomSources ? (
            <p className="text-xs text-amber-700">
              You have unsaved source changes. Save before leaving this page.
            </p>
          ) : null}

          {displayError ? (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}

          {showSuccessMessage ? (
            <p className="text-sm text-green-700">Inbox AI sources saved.</p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save sources"}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface PresetSourceRowProps {
  source: InboxAiPresetSourceDisplay;
  isExpanded: boolean;
  onToggle: () => void;
}

function PresetSourceRow({ source, isExpanded, onToggle }: PresetSourceRowProps) {
  return (
    <>
      <tr
        className={cn(
          "group border-b border-cos-border transition-colors last:border-b-0",
          "hover:bg-cos-bg/50",
          isExpanded && "bg-cos-bg/40",
        )}
      >
        <td className="py-3 pl-3 pr-1 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${source.label}`}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
        </td>
        <td
          className="cursor-pointer py-3 pr-4 align-top"
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <p className="font-medium text-cos-text">{source.label}</p>
          {source.url ? (
            <Link
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cos-muted hover:text-cos-text"
              onClick={(event) => event.stopPropagation()}
            >
              {source.url}
            </Link>
          ) : null}
        </td>
        <td className="py-3 pr-4 align-top text-cos-muted">{source.type}</td>
        <td className="py-3 pr-4 align-top">
          <Badge variant="success">Active</Badge>
        </td>
        <td className="py-3 pr-3 align-top" />
      </tr>
      {isExpanded ? (
        <tr className="border-b border-cos-border bg-cos-bg/30 last:border-b-0">
          <td colSpan={5} className="px-5 py-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                Description
              </p>
              <p className="text-sm text-cos-muted">
                This source is synced from School Setup. Add a custom source with the same
                URL if you want a description to help match parent questions.
              </p>
              <Button href="/settings/school-setup" size="sm" variant="secondary">
                Edit in School Setup
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

interface CustomSourceRowProps {
  source: InboxAiSourcesSettingsInput["customSources"][number];
  index: number;
  isExpanded: boolean;
  hasUrl: boolean;
  hasDescription: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (field: "label" | "url" | "description", value: string) => void;
}

function CustomSourceRow({
  source,
  index,
  isExpanded,
  hasUrl,
  hasDescription,
  onToggle,
  onRemove,
  onUpdate,
}: CustomSourceRowProps) {
  const label = source.label.trim() || "New source";
  const statusVariant = hasUrl ? "success" : "warning";
  const statusLabel = hasUrl ? "Active" : "Draft";

  return (
    <>
      <tr
        className={cn(
          "group border-b border-cos-border transition-colors last:border-b-0",
          "hover:bg-cos-bg/50",
          isExpanded && "bg-cos-bg/40",
        )}
      >
        <td className="py-3 pl-3 pr-1 align-top">
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${label}`}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
        </td>
        <td
          className="cursor-pointer py-3 pr-4 align-top"
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggle();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <p className="font-medium text-cos-text">{label}</p>
          {source.url.trim() ? (
            <p className="text-xs text-cos-muted">{source.url.trim()}</p>
          ) : (
            <p className="text-xs text-cos-muted">Add a URL to activate this source</p>
          )}
          {!isExpanded && hasDescription ? (
            <p className="mt-1 line-clamp-1 text-xs text-cos-muted">
              {(source.description ?? "").trim()}
            </p>
          ) : null}
        </td>
        <td className="py-3 pr-4 align-top text-cos-muted">Custom link</td>
        <td className="py-3 pr-4 align-top">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </td>
        <td className="py-3 pr-3 align-top">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 opacity-70 transition-opacity group-hover:opacity-100"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      {isExpanded ? (
        <tr className="border-b border-cos-border bg-cos-bg/30 last:border-b-0">
          <td colSpan={5} className="px-5 py-4">
            <div className="grid max-w-3xl gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id={`custom-label-${index}`}
                  label="Label"
                  placeholder="School Bucks"
                  value={source.label}
                  onChange={(event) => onUpdate("label", event.target.value)}
                />
                <Input
                  id={`custom-url-${index}`}
                  label="URL"
                  type="url"
                  placeholder="https://..."
                  value={source.url}
                  onChange={(event) => onUpdate("url", event.target.value)}
                />
              </div>
              <Textarea
                id={`custom-description-${index}`}
                label="Description"
                placeholder="Add lunch money and pay for school meals online"
                hint="Used to match parent questions to this source."
                value={source.description ?? ""}
                onChange={(event) => onUpdate("description", event.target.value)}
                rows={3}
                className="min-h-20"
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
