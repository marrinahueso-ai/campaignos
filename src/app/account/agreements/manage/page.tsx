import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/queries";
import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";
import { ensureDeveloperAgreementsSeeded } from "@/lib/developer-agreements/ensure-seed";
import {
  listDeveloperAgreementDocumentsForManage,
  listPendingCompanyCountersignatures,
} from "@/lib/developer-agreements/queries";
import { ManageAgreementsClient } from "@/components/developer-agreements/ManageAgreementsClient";

export default async function ManageDeveloperAgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  if (!(await canManageDeveloperAgreements())) {
    redirect("/account/agreements");
  }

  await ensureDeveloperAgreementsSeeded();
  const [documents, queue] = await Promise.all([
    listDeveloperAgreementDocumentsForManage(),
    listPendingCompanyCountersignatures(),
  ]);
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#f6f2eb]">
      <ManageAgreementsClient
        documents={documents}
        queue={queue}
        published={params.published === "1"}
      />
    </main>
  );
}
