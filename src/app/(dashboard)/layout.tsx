import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAuthUser } from "@/lib/auth/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  return <DashboardShell userEmail={user?.email ?? null}>{children}</DashboardShell>;
}
