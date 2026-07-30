import { after } from "next/server";
import { Suspense } from "react";
import { ApprovalsSchedulingHub } from "@/components/approvals-scheduling/ApprovalsSchedulingHub";
import { getApprovalsLayoutForCurrentUser } from "@/lib/approvals-scheduling/approvals-layout-queries";
import { getUnifiedApprovalsSchedulingData } from "@/lib/approvals-scheduling/queries";
import { backfillMetaApprovalRequests } from "@/lib/event-workspace/meta-approval-sync";
import ApprovalsLoading from "./loading";

export const metadata = {
  title: "Approvals & Scheduling",
};

interface ApprovalsPageProps {
  searchParams: Promise<{ event?: string }>;
}

async function ApprovalsPageContent({ searchParams }: ApprovalsPageProps) {
  const params = await searchParams;
  const [data, initialSummaryLayout] = await Promise.all([
    getUnifiedApprovalsSchedulingData(),
    getApprovalsLayoutForCurrentUser(),
  ]);

  // Write-owned sync after the response — keep Approvals accurate without
  // blocking document TTFB or running on every layout navigation.
  after(() => {
    void backfillMetaApprovalRequests(null).catch((error: unknown) => {
      console.error(
        "Post-response meta approval backfill failed:",
        error instanceof Error ? error.message : error,
      );
    });
  });

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
