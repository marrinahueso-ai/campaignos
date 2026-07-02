import { ApprovalsHub } from "@/components/approvals/ApprovalsHub";
import { getApprovalQueueForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";

export const metadata = {
  title: "Approvals",
};

export default async function ApprovalsPage() {
  const queue = await getApprovalQueueForCurrentUser();

  return (
    <ApprovalsHub
      assignedToMe={queue.assignedToMe}
      allPending={queue.allPending}
      changesRequested={queue.changesRequested}
      recentlyApproved={queue.recentlyApproved}
    />
  );
}
