"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import {
  uploadCalendarFileAction,
  type CalendarImportActionState,
} from "@/lib/calendar-import/actions";

const initialState: CalendarImportActionState = {
  error: null,
  success: false,
};

export function CalendarImportForm() {
  const [state, formAction, isPending] = useActionState(
    uploadCalendarFileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <FileUpload
        name="calendarFile"
        label="School calendar file"
        hint="PDF or Word (.docx) work best. CSV and ICS are also supported."
        accept=".pdf,.docx,.csv,.ics,.xlsx,.xls"
      />

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        <Upload className="h-4 w-4" />
        {isPending ? "Uploading..." : "Upload and review dates"}
      </Button>
    </form>
  );
}
