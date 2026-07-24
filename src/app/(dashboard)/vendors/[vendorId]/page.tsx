import { notFound } from "next/navigation";
import { VendorProfileShell } from "@/components/vendors/VendorProfileShell";
import {
  getVendorDetailData,
  getVendorNameForMetadata,
} from "@/lib/vendors/queries";

interface VendorProfilePageProps {
  params: Promise<{ vendorId: string }>;
}

export async function generateMetadata({ params }: VendorProfilePageProps) {
  const { vendorId } = await params;
  const name = await getVendorNameForMetadata(vendorId);

  return {
    title: name ? `${name} — Vendor` : "Vendor",
  };
}

export default async function VendorProfilePage({ params }: VendorProfilePageProps) {
  const { vendorId } = await params;
  const data = await getVendorDetailData(vendorId);

  if (!data) {
    notFound();
  }

  return (
    <VendorProfileShell data={data} categories={data.categories} />
  );
}
