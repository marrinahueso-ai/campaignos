import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/queries";
import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";
import { CountersignClient } from "@/components/developer-agreements/CountersignClient";
import {
  getCountersignDetail,
  listPendingCompanyCountersignatures,
} from "@/lib/developer-agreements/queries";

export default async function CountersignAgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; done?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!(await canManageDeveloperAgreements())) {
    redirect("/account/agreements");
  }

  const params = await searchParams;
  const queue = await listPendingCompanyCountersignatures();
  const detail = params.id
    ? await getCountersignDetail(params.id)
    : null;

  return (
    <CountersignClient
      detail={detail}
      queue={queue}
      done={params.done === "1"}
    />
  );
}
