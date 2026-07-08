import { ApprovalsSchedulingHub } from "@/components/approvals-scheduling/ApprovalsSchedulingHub";
import { getUnifiedApprovalsSchedulingData } from "@/lib/approvals-scheduling/queries";

export const metadata = {
  title: "Approvals & Scheduling",
};

interface ApprovalsPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function ApprovalsPage({ searchParams }: ApprovalsPageProps) {
  const params = await searchParams;
  const data = await getUnifiedApprovalsSchedulingData();

  return (
    <ApprovalsSchedulingHub
      {...data}
      initialEventFilter={params.event ?? null}
    />
  );
}
