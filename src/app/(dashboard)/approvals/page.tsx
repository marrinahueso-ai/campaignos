import { ApprovalsHub } from "@/components/approvals/ApprovalsHub";
import { getApprovalQueueForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";

export const metadata = {
  title: "Approvals",
};

interface ApprovalsPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const params = await searchParams;
  const queue = await getApprovalQueueForCurrentUser();

  return (
    <ApprovalsHub
      assignedToMe={queue.assignedToMe}
      allPending={queue.allPending}
      changesRequested={queue.changesRequested}
      recentlyApproved={queue.recentlyApproved}
      eventIdFilter={params.event ?? null}
    />
  );
}
