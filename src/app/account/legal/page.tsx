import { redirect } from "next/navigation";
import { AgreementThemeShell } from "@/components/developer-agreements/AgreementThemeShell";
import { LegalAcceptanceGate } from "@/components/legal/LegalAcceptanceGate";
import { getAuthUser } from "@/lib/auth/queries";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { safePostAcceptancePath } from "@/lib/legal/acceptances-pure";
import { userMustAcceptCurrentTerms } from "@/lib/legal/gate";

export const metadata = {
  title: "Terms of Service",
};

export default async function LegalAcceptancePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const next = safePostAcceptancePath(safeNextPath(params.next));

  const supabase = await createClient();
  const mustAccept = await userMustAcceptCurrentTerms(supabase, user.id);
  if (!mustAccept) {
    redirect(await getAuthenticatedAppPath(next));
  }

  return (
    <AgreementThemeShell eyebrow="Terms of Service">
      <LegalAcceptanceGate nextPath={next} />
    </AgreementThemeShell>
  );
}
