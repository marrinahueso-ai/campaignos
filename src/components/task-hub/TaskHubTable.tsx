"use client";

import { cn } from "@/lib/utils/cn";

interface TaskHubTableProps {
  children: React.ReactNode;
  className?: string;
}

export function TaskHubTable({ children, className }: TaskHubTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="task-hub-table w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-cos-border bg-cos-bg/60">
            <th className="w-8 px-2 py-2.5" aria-hidden />
            <th className="px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-cos-muted uppercase">
              Task
            </th>
            <th className="hidden px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-cos-muted uppercase md:table-cell">
              Committee
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-cos-muted uppercase">
              Event
            </th>
            <th className="hidden px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-cos-muted uppercase lg:table-cell">
              Owner
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-cos-muted uppercase">
              Status
            </th>
            <th className="hidden px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-cos-muted uppercase sm:table-cell">
              Due date
            </th>
            <th className="w-16 px-3 py-2.5 text-center text-[11px] font-medium tracking-wide text-cos-muted uppercase">
              Sync
            </th>
            <th className="w-10 px-2 py-2.5" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
