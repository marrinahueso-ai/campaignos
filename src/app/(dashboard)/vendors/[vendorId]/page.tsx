import { notFound } from "next/navigation";
import { VendorProfileShell } from "@/components/vendors/VendorProfileShell";
import {
  getVendorCategories,
  getVendorDetailData,
} from "@/lib/vendors/queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";

interface VendorProfilePageProps {
  params: Promise<{ vendorId: string }>;
}

export async function generateMetadata({ params }: VendorProfilePageProps) {
  const { vendorId } = await params;
  const data = await getVendorDetailData(vendorId);

  return {
    title: data ? `${data.vendor.name} — Vendor` : "Vendor",
  };
}

export default async function VendorProfilePage({ params }: VendorProfilePageProps) {
  const { vendorId } = await params;
  const [data, organization] = await Promise.all([
    getVendorDetailData(vendorId),
    getCurrentOrganization(),
  ]);

  if (!data) {
    notFound();
  }

  const categories = organization
    ? await getVendorCategories(organization.id)
    : [];

  return <VendorProfileShell data={data} categories={categories} />;
}
