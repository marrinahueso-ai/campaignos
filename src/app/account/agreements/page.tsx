import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/queries";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { resolveAuthenticatedAppPath } from "@/lib/auth/post-auth-path";
import { DeveloperAgreementsClient } from "@/components/developer-agreements/DeveloperAgreementsClient";
import { AgreementThemeShell } from "@/components/developer-agreements/AgreementThemeShell";
import { ensureDeveloperAgreementsSeeded } from "@/lib/developer-agreements/ensure-seed";
import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";
import {
  getDeveloperAgreementSigningProgress,
  listMyExecutedAgreements,
} from "@/lib/developer-agreements/queries";

export default async function DeveloperAgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ signed?: string; complete?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  await ensureDeveloperAgreementsSeeded();

  const progress = await getDeveloperAgreementSigningProgress(user.id);
  const params = await searchParams;
  const membership = await getActiveMembership();
  const developerName =
    membership?.user.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "";

  if (progress.mustSign) {
    return (
      <DeveloperAgreementsClient
        documents={progress.documents}
        developerName={String(developerName)}
        developerEmail={membership?.user.email || user.email || ""}
        justSigned={params.signed === "1"}
      />
    );
  }

  const mine = await listMyExecutedAgreements(user.id);
  const isOwner = await canManageDeveloperAgreements();

  if (!mine.length && !isOwner) {
    redirect(resolveAuthenticatedAppPath(true, null));
  }

  return (
    <AgreementThemeShell eyebrow="Developer agreements">
      <h1 className="font-serif text-3xl text-cos-text md:text-4xl">
        {params.complete === "1"
          ? "Your signatures are saved"
          : "Your developer agreements"}
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
        {params.complete === "1"
          ? "Hey Ralli has been notified to counter-sign. When both parties have signed, a full executed copy is emailed to everyone and available to download below."
          : "Download executed copies once Hey Ralli has counter-signed. Pending items show your signature only until the company signs."}
      </p>

      {mine.length > 0 && (
        <ul className="mt-8 divide-y divide-cos-border rounded-2xl border border-cos-border bg-cos-card shadow-sm">
          {mine.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-cos-text">{item.title}</p>
                <p className="text-xs text-cos-muted">
                  {item.versionLabel}
                  {" · "}
                  {item.fullyExecuted
                    ? "Fully executed"
                    : "Awaiting Hey Ralli counter-signature"}
                </p>
              </div>
              {item.canDownload ? (
                <a
                  className="text-sm font-medium text-cos-primary underline"
                  href={`/api/developer-agreements/download?id=${item.id}`}
                >
                  Download
                </a>
              ) : (
                <span className="text-xs text-cos-muted">Preparing…</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href="/dashboard"
          className="font-medium text-cos-primary underline"
        >
          Continue to dashboard
        </Link>
        {isOwner && (
          <>
            <Link
              href="/account/agreements/countersign"
              className="font-medium text-cos-primary underline"
            >
              Counter-sign queue
            </Link>
            <Link
              href="/account/agreements/manage"
              className="font-medium text-cos-primary underline"
            >
              Manage templates
            </Link>
          </>
        )}
      </div>
    </AgreementThemeShell>
  );
}
