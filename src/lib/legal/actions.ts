"use server";

import { redirect } from "next/navigation";
import { getAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { getAuthUser } from "@/lib/auth/queries";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { recordCurrentLegalAcceptance } from "@/lib/legal/acceptances";
import { safePostAcceptancePath } from "@/lib/legal/acceptances-pure";

export type LegalAcceptanceActionState = {
  error: string | null;
};

export async function acceptCurrentLegalDocumentsAction(
  _prev: LegalAcceptanceActionState,
  formData: FormData,
): Promise<LegalAcceptanceActionState> {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  // Ignore any client-supplied user id. Session identity is the only source.
  const spoofedUserId = formData.get("user_id")?.toString() ?? null;

  const result = await recordCurrentLegalAcceptance({
    sessionUserId: user.id,
    requestedUserId: spoofedUserId,
    source: "reaccept_gate",
  });

  if (!result.ok) {
    return { error: result.error };
  }

  const next = safePostAcceptancePath(
    safeNextPath(formData.get("next")?.toString()),
  );
  redirect(await getAuthenticatedAppPath(next));
}
