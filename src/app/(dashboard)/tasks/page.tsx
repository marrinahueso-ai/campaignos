import { TaskHubList } from "@/components/task-hub/TaskHubList";
import { getTaskHubPageData } from "@/lib/task-hub/queries";

export const metadata = {
  title: "Task hub",
};

export default async function TaskHubPage() {
  const data = await getTaskHubPageData();

  return (
    <div className="studio-page pb-12">
      <header className="mb-8">
        <p className="text-xs font-medium tracking-[0.16em] text-cos-muted uppercase">
          Planning
        </p>
        <h1 className="mt-2 font-display text-3xl text-cos-text">Task hub</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
          Master checklist across active campaigns, grouped by committee. Tasks stay
          synced with each event&apos;s planning hub.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-cos-muted">
          <span>{data.scopeLabel}</span>
          <span aria-hidden>·</span>
          <span>
            {data.openTasks} open · {data.totalTasks} total
          </span>
        </div>
      </header>

      {/* Phase 2: board and calendar views */}
      <div className="mb-6 flex gap-2 border-b border-cos-border pb-3">
        <span className="border-b-2 border-cos-dark px-2 pb-2 text-sm font-medium text-cos-text">
          List
        </span>
        <span
          className="px-2 pb-2 text-sm text-cos-muted"
          title="Coming soon"
        >
          Board
        </span>
        <span
          className="px-2 pb-2 text-sm text-cos-muted"
          title="Coming soon"
        >
          Calendar
        </span>
      </div>

      <TaskHubList data={data} />
    </div>
  );
}
