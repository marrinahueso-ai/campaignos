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

export function MondaySettingsShell({
  organizationName,
  oauthCallbackUrl,
  statusMessage,
  statusTone,
  justConnected,
}: MondaySettingsShellProps) {
  const [loadState, setLoadState] = useState<
    | { status: "loading" }
    | {
        status: "ready";
        connected: boolean;
        integrationConfigured: boolean;
        syncEnabled: boolean;
        boardConfigured: boolean;
        accountSlug: string | null;
        savedMapping: SavedBoardMapping | null;
        pageLoadError: string | null;
      }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const result = await getMondaySettingsPageStateAction();
        if (cancelled) {
          return;
        }

        if (!result.success) {
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
              "Some Monday settings could not be loaded. You can still disconnect below.",
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
        console.error("Monday settings client load failed:", error);
        setLoadState({
          status: "error",
          message:
            "Monday settings failed to load. Refresh the page or disconnect Monday below if the problem continues.",
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
  const pageLoadError =
    loadState.status === "error"
      ? loadState.message
      : ready?.pageLoadError ?? null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Monday"
        description={`Sync playbook tasks with Monday.com for ${organizationName ?? "your PTO"}. One master board with groups per committee.`}
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
            OAuth connection for your organization. Enable sync when you are ready to push tasks.
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
            {savedMapping?.mondayBoardId
              ? "Update your master board or column mapping."
              : "Pick a master board and map Status, Date, Assignee, Task ID, and Event link columns."}
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
            />
          )}
        </div>
      </Card>
    </div>
  );
}
