"use client";

import { useEffect, useState } from "react";
import { MondayBoardMappingPanel } from "@/components/monday/MondayBoardMappingPanel";
import { MondayConnectionPanel } from "@/components/monday/MondayConnectionPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getMondaySettingsPageStateAction } from "@/lib/monday/settings-actions";
import type { MondayBoardColumnMap } from "@/lib/monday/types";

interface SavedBoardMapping {
  mondayBoardId: string;
  mondayWorkspaceId: string | null;
  columnMap: MondayBoardColumnMap;
}

interface MondaySettingsShellProps {
  organizationName: string | null;
  oauthCallbackUrl: string;
  statusMessage: string | null;
  statusTone: "success" | "error" | null;
  justConnected: boolean;
}

type ReadyLoadState = {
  status: "ready";
  connected: boolean;
  integrationConfigured: boolean;
  syncEnabled: boolean;
  boardConfigured: boolean;
  accountSlug: string | null;
  savedMapping: SavedBoardMapping | null;
  pageLoadError: string | null;
};

function formatClientLoadError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function MondaySettingsShell({
  organizationName,
  oauthCallbackUrl,
  statusMessage,
  statusTone,
  justConnected,
}: MondaySettingsShellProps) {
  const [loadState, setLoadState] = useState<ReadyLoadState | { status: "loading" }>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const result = await getMondaySettingsPageStateAction();
        if (cancelled) {
          return;
        }

        if (!result) {
          console.error(
            "Monday settings client load failed: server action returned no payload. Hard refresh the page after deploy.",
          );
          setLoadState({
            status: "ready",
            connected: false,
            integrationConfigured: false,
            syncEnabled: false,
            boardConfigured: false,
            accountSlug: null,
            savedMapping: null,
            pageLoadError: null,
          });
          return;
        }

        if (!result.success) {
          console.warn(
            "Monday settings partial load failure:",
            result.error ?? "unknown error",
          );
          setLoadState({
            status: "ready",
            connected: false,
            integrationConfigured: result.integrationConfigured,
            syncEnabled: false,
            boardConfigured: false,
            accountSlug: null,
            savedMapping: null,
            pageLoadError:
              result.error ??
              "Some Monday settings could not be loaded. You can still connect Monday below.",
          });
          return;
        }

        setLoadState({
          status: "ready",
          connected: result.connected,
          integrationConfigured: result.integrationConfigured,
          syncEnabled: result.syncEnabled,
          boardConfigured: result.boardConfigured,
          accountSlug: result.accountSlug,
          savedMapping: result.savedMapping,
          pageLoadError: result.pageLoadError,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error(
          "Monday settings client load failed (server action transport error):",
          formatClientLoadError(error),
          error,
        );
        setLoadState({
          status: "ready",
          connected: false,
          integrationConfigured: false,
          syncEnabled: false,
          boardConfigured: false,
          accountSlug: null,
          savedMapping: null,
          pageLoadError: null,
        });
      }
    }

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = loadState.status === "ready" ? loadState : null;
  const connected = ready?.connected ?? false;
  const integrationConfigured = ready?.integrationConfigured ?? false;
  const syncEnabled = ready?.syncEnabled ?? false;
  const boardConfigured = ready?.boardConfigured ?? false;
  const accountSlug = ready?.accountSlug ?? null;
  const savedMapping = ready?.savedMapping ?? null;
  const pageLoadError = ready?.pageLoadError ?? null;

  function handleBoardStateChange(update: {
    savedMapping?: SavedBoardMapping | null;
    boardConfigured?: boolean;
  }) {
    setLoadState((current) => {
      if (current.status !== "ready") {
        return current;
      }
      return {
        ...current,
        savedMapping:
          update.savedMapping !== undefined ? update.savedMapping : current.savedMapping,
        boardConfigured: update.boardConfigured ?? current.boardConfigured,
      };
    });
  }

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Monday"
        description={`Sync playbook tasks with Monday.com for ${organizationName ?? "your PTO"}. Connect, create or pick a board, map columns, then enable sync.`}
        eyebrow="Configure"
      />

      {loadState.status === "loading" && (
        <p className="text-sm text-cos-muted" role="status">
          Loading Monday settings…
        </p>
      )}

      {pageLoadError && (
        <p className="text-sm text-amber-800" role="status">
          {pageLoadError}
        </p>
      )}

      {statusMessage && statusTone && (
        <p
          className={
            statusTone === "success" ? "text-sm text-emerald-700" : "text-sm text-red-600"
          }
          role="status"
        >
          {statusMessage}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{connected ? "Connected" : "Connect Monday"}</CardTitle>
          <CardDescription>
            OAuth connection for your organization. Enable sync only after board mapping is saved.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <MondayConnectionPanel
            connected={connected}
            integrationConfigured={integrationConfigured}
            syncEnabled={syncEnabled}
            boardConfigured={boardConfigured}
            accountSlug={accountSlug}
            oauthCallbackUrl={oauthCallbackUrl}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Board &amp; columns</CardTitle>
          <CardDescription>
            Create the PTO template board or pick an existing board, then map Status, Date,
            Assignee, Task ID, and Event link columns.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          {loadState.status === "loading" ? (
            <p className="text-sm text-cos-muted">Loading board settings…</p>
          ) : (
            <MondayBoardMappingPanel
              connected={connected}
              syncEnabled={syncEnabled}
              justConnected={justConnected}
              savedMapping={savedMapping}
              onBoardStateChange={handleBoardStateChange}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
