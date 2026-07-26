"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import {
  uploadCalendarFileAction,
  type CalendarImportActionState,
} from "@/lib/calendar-import/actions";
import { cn } from "@/lib/utils/cn";

const initialState: CalendarImportActionState = {
  error: null,
  success: false,
};

interface CalendarImportFormProps {
  variant?: "default" | "ease";
}

export function CalendarImportForm({
  variant = "default",
}: CalendarImportFormProps) {
  const [state, formAction, isPending] = useActionState(
    uploadCalendarFileAction,
    initialState,
  );
  const ease = variant === "ease";

  return (
    <form action={formAction} className={cn(ease ? "space-y-5" : "space-y-6")}>
      <FileUpload
        name="calendarFile"
        label="School calendar file"
        hint="PDF or Word (.docx) work best. CSV and ICS are also supported."
        accept=".pdf,.docx,.csv,.ics,.xlsx,.xls"
        variant={variant}
      />

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      {ease ? (
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {isPending ? "Uploading…" : "Upload and review dates"}
        </button>
      ) : (
        <Button type="submit" disabled={isPending}>
          <Upload className="h-4 w-4" />
          {isPending ? "Uploading..." : "Upload and review dates"}
        </Button>
      )}
    </form>
  );
}
