import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { resolveAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { DeveloperAgreementsClient } from "@/components/developer-agreements/DeveloperAgreementsClient";
import { ensureDeveloperAgreementsSeeded } from "@/lib/developer-agreements/ensure-seed";
import { getDeveloperAgreementSigningProgress } from "@/lib/developer-agreements/queries";

export default async function DeveloperAgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ signed?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  await ensureDeveloperAgreementsSeeded();

  const progress = await getDeveloperAgreementSigningProgress(user.id);
  if (!progress.mustSign && progress.documents.length === 0) {
    redirect(resolveAuthenticatedAppPath(true, null));
  }
  if (!progress.mustSign && progress.documents.every((doc) => doc.signed)) {
    redirect(resolveAuthenticatedAppPath(true, null));
  }

  const membership = await getActiveMembership();
  const params = await searchParams;
  const developerName =
    membership?.user.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "";

  return (
    <DeveloperAgreementsClient
      documents={progress.documents}
      developerName={String(developerName)}
      developerEmail={membership?.user.email || user.email || ""}
      justSigned={params.signed === "1"}
    />
  );
}
