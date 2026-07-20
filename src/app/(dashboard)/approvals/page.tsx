import { after } from "next/server";
import { ApprovalsSchedulingHub } from "@/components/approvals-scheduling/ApprovalsSchedulingHub";
import { getUnifiedApprovalsSchedulingData } from "@/lib/approvals-scheduling/queries";
import { backfillMetaApprovalRequests } from "@/lib/event-workspace/meta-approval-sync";

export const metadata = {
  title: "Approvals & Scheduling",
};

interface ApprovalsPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const params = await searchParams;
  const data = await getUnifiedApprovalsSchedulingData();

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
    />
  );
}
