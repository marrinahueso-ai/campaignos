import { cn } from "@/lib/utils/cn";
import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "info" | "scheduled";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-cos-bg-alt text-cos-text",
  success: "bg-cos-success-bg text-cos-success-text",
  warning: "bg-cos-warning text-cos-warning-text",
  info: "bg-cos-info text-cos-info-text",
  scheduled: "bg-cos-info text-cos-info-text",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
