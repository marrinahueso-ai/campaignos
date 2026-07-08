import { FilesDocumentsShell } from "@/components/campaign-files/FilesDocumentsShell";
import { getFilesPageData } from "@/lib/campaign-files/queries";

export const metadata = {
  title: "Files & Documents",
};

export default async function FilesPage() {
  const data = await getFilesPageData();

  return (
    <div className="studio-page pb-12">
      <FilesDocumentsShell data={data} scope="global" />
    </div>
  );
}
