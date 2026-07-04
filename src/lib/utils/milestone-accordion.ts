import { cn } from "@/lib/utils/cn";

export function milestoneAccordionCardClassName(className?: string) {
  return cn("milestone-accordion-card", className);
}

export function milestoneAccordionCardProps(expanded: boolean, className?: string) {
  return {
    className: milestoneAccordionCardClassName(className),
    "data-expanded": expanded ? "true" : "false",
  } as const;
}
