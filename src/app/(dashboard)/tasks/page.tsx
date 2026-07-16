import { Suspense } from "react";
import { TasksV2Shell } from "@/components/tasks-v2/TasksV2Shell";
import { getTasksV2PageData } from "@/lib/tasks-v2/queries";

export const metadata = {
  title: "Tasks",
};

interface TasksPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const data = await getTasksV2PageData();

  return (
    <div className="studio-page pb-12">
      <Suspense fallback={<div className="min-h-[16rem] animate-pulse bg-cos-bg/60" />}>
        <TasksV2Shell
          data={data}
          initialEventFilter={params.event ?? null}
        />
      </Suspense>
    </div>
  );
}
