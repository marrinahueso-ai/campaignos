import { cookies } from "next/headers";
import { after } from "next/server";
import { Suspense } from "react";
import { ApprovalsSchedulingHub } from "@/components/approvals-scheduling/ApprovalsSchedulingHub";
import { getApprovalsLayoutForCurrentUser } from "@/lib/approvals-scheduling/approvals-layout-queries";
import { getUnifiedApprovalsSchedulingData } from "@/lib/approvals-scheduling/queries";
import { backfillMetaApprovalRequestsForEvents } from "@/lib/event-workspace/meta-approval-sync";
import { resolveScopedOrgEventIds } from "@/lib/events/org-scope";
import { runWithRequestCookies } from "@/lib/supabase/request-cookies";
import ApprovalsLoading from "./loading";

export const metadata = {
  title: "Approvals & Scheduling",
};

interface ApprovalsPageProps {
  searchParams: Promise<{ event?: string }>;
}

async function ApprovalsPageContent({ searchParams }: ApprovalsPageProps) {
  const params = await searchParams;
  // Resolved during render (not inside after()) so the backfill is bound to
  // exactly the viewing organization's own events — the scheduling sidebar
  // badges already resolve this same cached call, so this is typically a
  // request-cache hit, not an extra query.
  const [data, initialSummaryLayout, backfillEventIds] = await Promise.all([
    getUnifiedApprovalsSchedulingData(),
    getApprovalsLayoutForCurrentUser(),
    resolveScopedOrgEventIds(undefined),
  ]);

  // Server Components cannot call cookies() inside after(). Snapshot during
  // render and reuse via runWithRequestCookies so createClient() still works.
  const cookieSnapshot = (await cookies()).getAll();

  // Write-owned sync after the response — keep Approvals accurate without
  // blocking document TTFB or running on every layout navigation. Scoped to
  // this organization's own events only: never a system-wide sweep (that
  // remains the daily /api/cron/meta-token-health job).
  if (backfillEventIds.length > 0) {
    after(() => {
      void runWithRequestCookies(cookieSnapshot, () =>
        backfillMetaApprovalRequestsForEvents(backfillEventIds, null),
      ).catch((error: unknown) => {
        console.error(
          "Post-response meta approval backfill failed:",
          error instanceof Error ? error.message : error,
        );
      });
    });
  }

  return (
    <ApprovalsSchedulingHub
      {...data}
      initialEventFilter={params.event ?? null}
      initialSummaryLayout={initialSummaryLayout}
    />
  );
}

export default function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  return (
    <Suspense fallback={<ApprovalsLoading />}>
      <ApprovalsPageContent searchParams={searchParams} />
    </Suspense>
  );
}
