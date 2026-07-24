import { FilesDocumentsShell } from "@/components/campaign-files/FilesDocumentsShell";
import type { FilesPageData } from "@/types/campaign-files";

interface FilesTabProps {
  eventId: string;
  data: FilesPageData;
}

/** Event detail Files tab — same library UX as /files (DnD, search, sort, filters). */
export function FilesTab({ eventId, data }: FilesTabProps) {
  return (
    <div className="min-h-[22rem]">
      <FilesDocumentsShell data={data} scope="event" lockedEventId={eventId} />
    </div>
  );
}
