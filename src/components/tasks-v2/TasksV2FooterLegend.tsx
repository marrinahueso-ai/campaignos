import { AlertCircle, ArrowDown, Sparkles } from "lucide-react";
import { tasksV2StatusLabel } from "@/lib/tasks-v2/status-labels";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

const LEGEND_STATUSES: EventPlaybookTaskStatus[] = [
  "done",
  "in_progress",
  "todo",
  "blocked",
];

const STATUS_DOT_COLORS: Record<EventPlaybookTaskStatus | "deferred", string> = {
  done: "#3f5240",
  in_progress: "#4a7fb5",
  todo: "#9a948c",
  blocked: "#b14f4f",
  deferred: "#7a5f9e",
};

export function TasksV2FooterLegend() {
  return (
    <footer className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-cos-border pt-4 text-[11px] text-cos-muted">
      <div className="flex flex-wrap items-center gap-3">
        {LEGEND_STATUSES.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_DOT_COLORS[status] }}
            />
            {tasksV2StatusLabel(status)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: STATUS_DOT_COLORS.deferred }}
          />
          {tasksV2StatusLabel("deferred")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-[#b14f4f]" />
          High
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#c87d3a]" />
          Medium
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowDown className="h-3 w-3 text-[#4a7fb5]" />
          Low
        </span>
      </div>
    </footer>
  );
}
