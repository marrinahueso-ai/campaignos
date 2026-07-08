import { FilesDocumentsShell } from "@/components/campaign-files/FilesDocumentsShell";
import type { FilesPageData } from "@/types/campaign-files";

interface FilesTabProps {
  eventId: string;
  data: FilesPageData;
}

export function FilesTab({ eventId, data }: FilesTabProps) {
  return (
    <FilesDocumentsShell data={data} scope="event" lockedEventId={eventId} />
  );
}
