"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface CalendarActionToastProps {
  message: string | null;
  variant?: "error" | "success";
  onDismiss: () => void;
}

export function CalendarActionToast({
  message,
  variant = "error",
  onDismiss,
}: CalendarActionToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1",
        variant === "error"
          ? "bg-red-50 text-red-700 ring-red-200"
          : "bg-emerald-50 text-emerald-800 ring-emerald-200",
      )}
    >
      {message}
    </div>
  );
}
