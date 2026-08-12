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

function FilesLoadingFallback() {
  return <div className="min-h-[16rem] animate-pulse bg-cos-bg/60" />;
}

async function FilesPageBody({ eventParam }: { eventParam: string | null }) {
  const [data, initialEventLayout] = await Promise.all([
    getFilesPageData(),
    getFilesLayoutForCurrentUser(),
  ]);

  return (
    <FilesEaseShell
      data={data}
      initialEventId={eventParam}
      initialEventLayout={initialEventLayout}
    />
  );
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const params = await searchParams;

  return (
    <div className="studio-page pb-12">
      <Suspense fallback={<FilesLoadingFallback />}>
        <FilesPageBody eventParam={params.event ?? null} />
      </Suspense>
    </div>
  );
}
