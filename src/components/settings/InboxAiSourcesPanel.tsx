"use client";

import {
  FormEvent,
  useActionState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  saveInboxAiSourcesAction,
  type InboxAiSourcesActionState,
} from "@/lib/organizations/inbox-ai-sources/actions";
import type { InboxAiSourcesSettingsInput } from "@/types/inbox-ai-sources";

const INITIAL_STATE: InboxAiSourcesActionState = {
  error: null,
  success: false,
};

interface InboxAiSourcesPanelProps {
  initialInput: InboxAiSourcesSettingsInput;
}

function serializeCustomSources(
  customSources: InboxAiSourcesSettingsInput["customSources"],
): string {
  return JSON.stringify(
    customSources.map((source) => ({
      id: source.id,
      label: source.label,
      url: source.url,
    })),
  );
}

export function InboxAiSourcesPanel({ initialInput }: InboxAiSourcesPanelProps) {
  const router = useRouter();
  const [customSources, setCustomSources] = useState(initialInput.customSources);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() =>
    serializeCustomSources(initialInput.customSources),
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    saveInboxAiSourcesAction,
    INITIAL_STATE,
  );

  const currentSnapshot = useMemo(
    () => serializeCustomSources(customSources),
    [customSources],
  );
  const hasUnsavedCustomSources = lastSavedSnapshot !== currentSnapshot;

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

  function addCustomSource() {
    setClientError(null);
    setCustomSources((current) => [...current, { label: "", url: "" }]);
  }

  function removeCustomSource(index: number) {
    setClientError(null);
    setCustomSources((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateCustomSource(
    index: number,
    field: "label" | "url",
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
    <form action={formAction} onSubmit={handleSubmit} className="cos-card space-y-6 p-6">
      <input
        type="hidden"
        name="customSourcesJson"
        value={serializeCustomSources(customSources)}
        readOnly
      />

      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-cos-accent" />
          Inbox AI sources
        </CardTitle>
        <CardDescription>
          Before drafting inbox replies, CampaignOS checks these pages in order: events,
          calendar, resources, then FAQ. Add custom pages after the defaults.
        </CardDescription>
      </CardHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="eventsUrl"
          label="School events page URL"
          type="url"
          placeholder="https://yourschool.org/events"
          defaultValue={initialInput.eventsUrl}
        />
        <Input
          name="calendarUrl"
          label="School calendar page URL"
          type="url"
          placeholder="https://yourschool.org/calendar"
          defaultValue={initialInput.calendarUrl}
        />
        <Input
          name="resourcesUrl"
          label="Resources page URL"
          type="url"
          placeholder="https://yourschool.org/resources"
          defaultValue={initialInput.resourcesUrl}
        />
        <Input
          name="faqUrl"
          label="FAQ / knowledge base URL"
          type="url"
          placeholder="https://yourschool.org/faq"
          defaultValue={initialInput.faqUrl}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-cos-text">Custom sources</h3>
            <p className="text-xs text-cos-muted">
              Checked after the four default pages above.
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={addCustomSource}>
            <Plus className="h-3.5 w-3.5" />
            Add source
          </Button>
        </div>

        {customSources.length === 0 ? (
          <p className="rounded-lg border border-dashed border-cos-border px-4 py-3 text-xs text-cos-muted">
            No custom sources yet.
          </p>
        ) : (
          <div className="space-y-3">
            {customSources.map((source, index) => (
              <div
                key={source.id ?? `custom-${index}`}
                className="grid gap-3 rounded-lg border border-cos-border bg-cos-bg/40 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <Input
                  id={`custom-label-${index}`}
                  label="Label"
                  placeholder="Volunteer handbook"
                  value={source.label}
                  onChange={(event) =>
                    updateCustomSource(index, "label", event.target.value)
                  }
                />
                <Input
                  id={`custom-url-${index}`}
                  label="URL"
                  type="url"
                  placeholder="https://..."
                  value={source.url}
                  onChange={(event) =>
                    updateCustomSource(index, "url", event.target.value)
                  }
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => removeCustomSource(index)}
                    aria-label={`Remove custom source ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasUnsavedCustomSources ? (
        <p className="text-xs text-amber-700">
          You have unsaved custom source changes. Save before leaving this page.
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
    </form>
  );
}
