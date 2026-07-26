import { Suspense } from "react";
import { FilesEaseShell } from "@/components/campaign-files/FilesEaseShell";
import { getFilesLayoutForCurrentUser } from "@/lib/campaign-files/files-layout-queries";
import { getFilesPageData } from "@/lib/campaign-files/queries";

export const metadata = {
  title: "Files",
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
      <Suspense fallback={<div className="min-h-[16rem] animate-pulse bg-cos-bg/60" />}>
        <FilesEaseShell
          data={data}
          initialEventId={params.event ?? null}
          initialEventLayout={initialEventLayout}
        />
      </Suspense>
    </div>
  );
}
