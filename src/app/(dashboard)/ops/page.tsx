import { redirect } from "next/navigation";
import { OwnerDashboard } from "@/components/ops/OwnerDashboard";
import { canAccessOwnerOps } from "@/lib/ops/access";
import {
  getOrganizationSignupsLast30Days,
  getOwnerDashboardMetrics,
  listDevelopersSigned,
} from "@/lib/ops/queries";

export const metadata = {
  title: "Owner dashboard",
  robots: { index: false, follow: false },
};

export default async function OwnerOpsPage() {
  if (!(await canAccessOwnerOps())) {
    redirect("/dashboard");
  }

  const [metrics, developersSigned, signupSeries] = await Promise.all([
    getOwnerDashboardMetrics(),
    listDevelopersSigned(75),
    getOrganizationSignupsLast30Days(),
  ]);

  return (
    <OwnerDashboard
      metrics={metrics}
      developersSigned={developersSigned}
      signupSeries={signupSeries}
    />
  );
}
