import { Suspense } from "react";
import { TasksEaseShell } from "@/components/tasks-v2/TasksEaseShell";
import { getTasksV2PageData } from "@/lib/tasks-v2/queries";

export const metadata = {
  title: "Tasks",
};

interface TasksPageProps {
  searchParams: Promise<{ event?: string }>;
}

async function TasksEaseShellLoader({
  eventFilter,
}: {
  eventFilter: string | null;
}) {
  const data = await getTasksV2PageData();
  return (
    <TasksEaseShell data={data} initialEventFilter={eventFilter} />
  );
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;

  return (
    <div className="studio-page pb-12">
      <Suspense
        fallback={
          <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
        }
      >
        <TasksEaseShellLoader eventFilter={params.event ?? null} />
      </Suspense>
    </div>
  );
}
