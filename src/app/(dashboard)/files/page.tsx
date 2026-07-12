import { FilesDocumentsShell } from "@/components/campaign-files/FilesDocumentsShell";
import { getFilesPageData } from "@/lib/campaign-files/queries";

export const metadata = {
  title: "Files & Documents",
};

interface FilesPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const params = await searchParams;
  const data = await getFilesPageData();

  return (
    <div className="studio-page pb-12">
      <FilesDocumentsShell
        data={data}
        scope="global"
        initialEventId={params.event ?? undefined}
      />
    </div>
  );
}
