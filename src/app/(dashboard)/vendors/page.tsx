import { Suspense } from "react";
import { VendorDirectoryShell } from "@/components/vendors/VendorDirectoryShell";
import { getVendorDirectoryPageData } from "@/lib/vendors/queries";

export const metadata = {
  title: "Vendors",
};

export default function VendorsPage() {
  return (
    <Suspense fallback={<VendorsLoadingFallback />}>
      <VendorsPageContent />
    </Suspense>
  );
}

async function VendorsPageContent() {
  const data = await getVendorDirectoryPageData();
  return <VendorDirectoryShell data={data} />;
}

function VendorsLoadingFallback() {
  return (
    <div className="relative space-y-4 pb-12">
      <div className="h-10 w-48 animate-pulse rounded-full bg-[rgba(42,38,34,0.06)]" />
      <div className="h-4 w-full max-w-md animate-pulse rounded-full bg-[rgba(42,38,34,0.06)]" />
      <div className="h-11 max-w-md animate-pulse rounded-full bg-[rgba(42,38,34,0.06)]" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-[22px] bg-[rgba(42,38,34,0.06)]"
          />
        ))}
      </div>
    </div>
  );
}
