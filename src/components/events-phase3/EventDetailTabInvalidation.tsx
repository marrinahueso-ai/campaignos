"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import type { EventDetailLazyTab } from "@/lib/events-phase3/tab-loaders";

export type InvalidateEventTabResult =
  | { success: true }
  | { success: false; error: string };

type EventDetailTabInvalidationValue = {
  eventId: string;
  invalidateEventTab: (
    tab: EventDetailLazyTab,
  ) => Promise<InvalidateEventTabResult>;
  refreshingTab: EventDetailLazyTab | null;
  refreshError: string | null;
};

const EventDetailTabInvalidationContext =
  createContext<EventDetailTabInvalidationValue | null>(null);

export function EventDetailTabInvalidationProvider({
  value,
  children,
}: {
  value: EventDetailTabInvalidationValue;
  children: React.ReactNode;
}) {
  return (
    <EventDetailTabInvalidationContext.Provider value={value}>
      {children}
    </EventDetailTabInvalidationContext.Provider>
  );
}

export function useEventDetailTabInvalidation() {
  return useContext(EventDetailTabInvalidationContext);
}

/**
 * After a successful Event Detail tab mutation: invalidate + refetch that tab.
 * On standalone /approvals or /tasks pages, falls back to router.refresh().
 */
export function useEventTabMutationRefresh(tab: EventDetailLazyTab) {
  const ctx = useEventDetailTabInvalidation();
  const router = useRouter();

  return useCallback(async () => {
    if (ctx) {
      return ctx.invalidateEventTab(tab);
    }
    router.refresh();
    return { success: true as const };
  }, [ctx, tab, router]);
}

export function useEventTabInvalidationValue(
  value: EventDetailTabInvalidationValue,
) {
  return useMemo(() => value, [value]);
}
