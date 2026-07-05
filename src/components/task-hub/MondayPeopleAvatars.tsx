"use client";

import { cn } from "@/lib/utils/cn";
import type { MondayPersonValue } from "@/lib/monday/types";

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

interface MondayPeopleAvatarsProps {
  people: MondayPersonValue[];
  max?: number;
  className?: string;
}

export function MondayPeopleAvatars({
  people,
  max = 3,
  className,
}: MondayPeopleAvatarsProps) {
  if (people.length === 0) {
    return <span className="text-xs text-cos-muted">—</span>;
  }

  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {visible.map((person, index) => (
        <span
          key={`${person.id ?? person.name}-${index}`}
          title={person.name || "Assignee"}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-cos-card bg-cos-accent-soft text-[10px] font-semibold text-cos-text"
        >
          {person.name ? initialsForName(person.name) : "?"}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-cos-card bg-cos-bg-alt text-[10px] font-medium text-cos-muted">
          +{overflow}
        </span>
      )}
    </div>
  );
}
