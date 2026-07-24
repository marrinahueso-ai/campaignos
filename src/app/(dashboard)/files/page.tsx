import { FilesDocumentsShell } from "@/components/campaign-files/FilesDocumentsShell";
import { getFilesLayoutForCurrentUser } from "@/lib/campaign-files/files-layout-queries";
import { getFilesPageData } from "@/lib/campaign-files/queries";

export const metadata = {
  title: "Files & Documents",
};

interface FilesPageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const params = await searchParams;
  const [data, initialEventLayout] = await Promise.all([
    getFilesPageData(),
    getFilesLayoutForCurrentUser(),
  ]);

  return (
    <div className="studio-page pb-12">
      <FilesDocumentsShell
        data={data}
        scope="global"
        initialEventId={params.event ?? undefined}
        initialEventLayout={initialEventLayout}
      />
    </div>
  );
}
