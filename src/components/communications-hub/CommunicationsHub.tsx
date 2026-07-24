"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { MessageCircle, MessagesSquare, Sparkles } from "lucide-react";
import { CommunicationsQueuePanel } from "@/components/communications-hub/CommunicationsQueuePanel";
import { CommunicationsTopBar } from "@/components/communications-hub/CommunicationsTopBar";
import { CommunicationsWorkspace } from "@/components/communications-hub/CommunicationsWorkspace";
import { CommunicationsAiPanel } from "@/components/communications-hub/CommunicationsWorkspacePanels";
import { EmptyState } from "@/components/ui/EmptyState";
import { markInboxThreadReadAction, refreshInboxConnectionStatusAction } from "@/lib/inbox/actions";
import type { InboxConnectionStatus, InboxPageData } from "@/lib/inbox/types";
import {
  computeQueueCounts,
  filterThreadsForCommunicationsHub,
  pickDefaultQueueFilter,
  type CommunicationsQueueFilter,
} from "@/lib/inbox/queue-utils";
import { COMMUNICATIONS_HUB_RESET_EVENT } from "@/lib/communications-hub/events";
import { cn } from "@/lib/utils/cn";

interface CommunicationsHubProps {
  data: InboxPageData;
}

export function CommunicationsHub({ data }: CommunicationsHubProps) {
  const router = useRouter();
  const [connection, setConnection] = useState<InboxConnectionStatus>(data.connection);
  const { threads, messagesByThreadId, orgMembers } = data;

  useEffect(() => {
    setConnection(data.connection);
  }, [data.connection]);

  // Defer Meta Graph health + page pictures until after first paint.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await refreshInboxConnectionStatusAction();
      if (!cancelled && result.success && result.connection) {
        setConnection(result.connection);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultQueueFilter = useMemo(() => pickDefaultQueueFilter(), []);

  const [queueFilter, setQueueFilter] = useState<CommunicationsQueueFilter>(defaultQueueFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [mobileShowAiPanel, setMobileShowAiPanel] = useState(false);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setQueueFilter("unread");
    setSelectedThreadId(null);
    setMobileShowDetail(false);
    setMobileShowAiPanel(false);
  }, []);

  const resetToDefault = useCallback(() => {
    setSearchQuery("");
    setQueueFilter(defaultQueueFilter);
    setSelectedThreadId(null);
    setMobileShowDetail(false);
    setMobileShowAiPanel(false);
  }, [defaultQueueFilter]);

  useEffect(() => {
    function handleSidebarReset() {
      resetToDefault();
    }

    window.addEventListener(COMMUNICATIONS_HUB_RESET_EVENT, handleSidebarReset);
    return () => {
      window.removeEventListener(COMMUNICATIONS_HUB_RESET_EVENT, handleSidebarReset);
    };
  }, [resetToDefault]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function refreshHub() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    function startPolling() {
      if (intervalId) {
        return;
      }
      intervalId = setInterval(refreshHub, 60_000);
    }

    function stopPolling() {
      if (!intervalId) {
        return;
      }
      clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshHub();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  const queueCounts = useMemo(
    () => computeQueueCounts(threads, messagesByThreadId),
    [threads, messagesByThreadId],
  );

  const filteredThreads = useMemo(
    () =>
      filterThreadsForCommunicationsHub({
        threads,
        messagesByThreadId,
        queueFilter,
        searchQuery,
      }),
    [threads, messagesByThreadId, queueFilter, searchQuery],
  );

  const selectedThread = useMemo(
    () => filteredThreads.find((thread) => thread.id === selectedThreadId) ?? null,
    [filteredThreads, selectedThreadId],
  );

  useEffect(() => {
    if (selectedThreadId && !filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(null);
      setMobileShowDetail(false);
      setMobileShowAiPanel(false);
    }
  }, [filteredThreads, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId && filteredThreads.length > 0) {
      setSelectedThreadId(filteredThreads[0]!.id);
    }
  }, [filteredThreads, selectedThreadId]);

  const showConnectionEmptyState =
    !connection.metaConnected && !connection.metaConfiguredViaEnv;
  const hasActiveFilters =
    searchQuery.trim().length > 0 || queueFilter !== defaultQueueFilter;

  function handleQueueFilterChange(filter: CommunicationsQueueFilter) {
    setQueueFilter(filter);
    setSelectedThreadId(null);
    setMobileShowDetail(false);
    setMobileShowAiPanel(false);
  }

  function handleSelectThread(threadId: string) {
    setSelectedThreadId(threadId);
    setMobileShowDetail(true);
    setMobileShowAiPanel(false);
    void markInboxThreadReadAction({ threadId }).then((result) => {
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[100rem] flex-col pb-16">
      <header className="mb-5">
        <h1 className="font-display text-4xl text-cos-text sm:text-[2.75rem] sm:leading-none">
          Communications Hub
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
          AI-Powered Inbox for Social Media
        </p>
      </header>

      <CommunicationsTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        connection={connection}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
        {showConnectionEmptyState ? (
          <EmptyState
            icon={MessagesSquare}
            title="Connect Meta to get started"
            description="Link your Facebook Page and Instagram in Settings. Messages will appear here automatically."
            action={{
              label: "Open Meta settings",
              href: "/settings/meta",
            }}
            className="py-16"
          />
        ) : (
          <div className="flex min-h-[min(760px,calc(100vh-13rem))] flex-col xl:flex-row">
            <CommunicationsQueuePanel
              threads={filteredThreads}
              messagesByThreadId={messagesByThreadId}
              selectedThreadId={selectedThreadId}
              queueFilter={queueFilter}
              queueCounts={queueCounts}
              onQueueFilterChange={handleQueueFilterChange}
              onSelectThread={handleSelectThread}
              className={cn(
                mobileShowDetail ? "hidden xl:flex" : "flex min-h-0 flex-1 xl:min-h-0 xl:flex-none",
              )}
            />

            {filteredThreads.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No conversations in this queue"
                description="Try another queue filter or clear filters to return to Unread."
                action={{
                  label: "Clear filters and show Unread",
                  onClick: clearFilters,
                }}
                className="flex min-h-0 flex-1 items-center justify-center py-16"
              />
            ) : (
              <>
                <CommunicationsWorkspace
                  thread={selectedThread}
                  messages={
                    selectedThread ? messagesByThreadId[selectedThread.id] ?? [] : []
                  }
                  orgMembers={orgMembers}
                  pageName={connection.pageName}
                  showBack
                  onBack={() => {
                    setMobileShowDetail(false);
                    setMobileShowAiPanel(false);
                  }}
                  onArchived={() => {
                    setSelectedThreadId(null);
                    setMobileShowDetail(false);
                    setMobileShowAiPanel(false);
                  }}
                  onMovedOutOfQueue={() => {
                    setSelectedThreadId(null);
                    setMobileShowDetail(false);
                    setMobileShowAiPanel(false);
                  }}
                  showAiPanel={!mobileShowAiPanel}
                  className={cn(!mobileShowDetail && "hidden xl:flex")}
                />

                {selectedThread && mobileShowDetail ? (
                  <div className="border-t border-cos-border xl:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileShowAiPanel((open) => !open)}
                      className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-cos-text hover:bg-cos-bg"
                    >
                      <Sparkles className="h-4 w-4 text-[#f5c842]" aria-hidden />
                      {mobileShowAiPanel ? "Hide AI Assistant" : "Show AI Assistant"}
                    </button>
                    {mobileShowAiPanel ? (
                      <CommunicationsAiPanel
                        thread={selectedThread}
                        messages={messagesByThreadId[selectedThread.id] ?? []}
                        pageName={connection.pageName}
                        className="border-t border-cos-border"
                      />
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cos-border bg-[#fffdf8] px-4 py-3 text-xs text-cos-muted">
        <p className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#f5c842]" aria-hidden />
          Tip: AI gets smarter with every conversation you review and send.
        </p>
        <Link href="/settings/inbox-ai" className="font-medium text-cos-text hover:underline">
          Manage AI sources
        </Link>
      </footer>
    </div>
  );
}
