import { Suspense } from "react";
import { VendorDirectoryShell } from "@/components/vendors/VendorDirectoryShell";
import { getVendorDirectoryPageData } from "@/lib/vendors/queries";
import { getVendorsDirectoryLayoutForCurrentUser } from "@/lib/vendors/vendors-directory-layout-queries";

export const metadata = {
  title: "Vendor Directory",
};

export default function VendorsPage() {
  return (
    <Suspense fallback={<VendorsLoadingFallback />}>
      <VendorsPageContent />
    </Suspense>
  );
}

async function VendorsPageContent() {
  const [data, summaryLayout] = await Promise.all([
    getVendorDirectoryPageData(),
    getVendorsDirectoryLayoutForCurrentUser(),
  ]);
  return <VendorDirectoryShell data={data} summaryLayout={summaryLayout} />;
}

function VendorsLoadingFallback() {
  return (
    <div className="studio-page space-y-6 pb-12">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-cos-bg-alt" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-cos-bg-alt" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-cos-bg-alt"
          />
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,16rem))] gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl bg-cos-bg-alt"
          />
        ))}
      </div>
    </div>
  );
}
