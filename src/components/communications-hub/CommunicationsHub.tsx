"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, MessagesSquare, Sparkles } from "lucide-react";
import { CommunicationsQueuePanel } from "@/components/communications-hub/CommunicationsQueuePanel";
import { CommunicationsTopBar } from "@/components/communications-hub/CommunicationsTopBar";
import { CommunicationsWorkspace } from "@/components/communications-hub/CommunicationsWorkspace";
import { CommunicationsAiPanel } from "@/components/communications-hub/CommunicationsWorkspacePanels";
import { EmptyState } from "@/components/ui/EmptyState";
import { markInboxThreadReadAction } from "@/lib/inbox/actions";
import type { InboxChannelType, InboxPageData } from "@/lib/inbox/types";
import {
  computeQueueCounts,
  filterThreadsForCommunicationsHub,
  type CommunicationsQueueFilter,
} from "@/lib/inbox/queue-utils";
import { cn } from "@/lib/utils/cn";

interface CommunicationsHubProps {
  data: InboxPageData;
}

export function CommunicationsHub({ data }: CommunicationsHubProps) {
  const router = useRouter();
  const { connection, threads, messagesByThreadId } = data;

  const [queueFilter, setQueueFilter] = useState<CommunicationsQueueFilter>("needs_reply");
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | InboxChannelType>("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [mobileShowAiPanel, setMobileShowAiPanel] = useState(false);

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
        channelFilter,
      }),
    [threads, messagesByThreadId, queueFilter, searchQuery, channelFilter],
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
  const showEmptyState =
    (connection.metaConnected || connection.metaConfiguredViaEnv) &&
    filteredThreads.length === 0;

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
        channelFilter={channelFilter}
        onChannelFilterChange={setChannelFilter}
        queueCounts={queueCounts}
        connection={connection}
        onAiQueueClick={() => setQueueFilter("waiting_on_ai")}
        aiQueueActive={queueFilter === "waiting_on_ai"}
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
        ) : showEmptyState ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations in this queue"
            description="Try another queue filter or wait for new DMs, comments, and mentions to arrive from Meta."
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
              onQueueFilterChange={setQueueFilter}
              onSelectThread={handleSelectThread}
              className={cn(
                mobileShowDetail ? "hidden xl:flex" : "flex min-h-0 flex-1 xl:min-h-0 xl:flex-none",
              )}
            />

            <CommunicationsWorkspace
              thread={selectedThread}
              messages={
                selectedThread ? messagesByThreadId[selectedThread.id] ?? [] : []
              }
              showBack
              onBack={() => {
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
                    className="border-t border-cos-border"
                  />
                ) : null}
              </div>
            ) : null}
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
