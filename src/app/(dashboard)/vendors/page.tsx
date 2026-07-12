import { Suspense } from "react";
import { VendorDirectoryShell } from "@/components/vendors/VendorDirectoryShell";
import { getVendorDirectoryPageData } from "@/lib/vendors/queries";

export const metadata = {
  title: "Vendor Directory",
};

export default async function VendorsPage() {
  const data = await getVendorDirectoryPageData();

  return (
    <Suspense fallback={<div className="studio-page p-8 text-sm text-cos-muted">Loading vendors...</div>}>
      <VendorDirectoryShell data={data} />
    </Suspense>
  );
}
