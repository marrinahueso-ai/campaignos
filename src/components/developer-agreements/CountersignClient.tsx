"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignaturePad } from "@/components/developer-agreements/SignaturePad";
import { AgreementThemeShell } from "@/components/developer-agreements/AgreementThemeShell";
import { SignedPartyCard } from "@/components/developer-agreements/SignedPartyCard";
import {
  countersignCompanyAgreementAction,
  type AgreementActionState,
} from "@/lib/developer-agreements/actions";

type Detail = {
  signatureId: string;
  fullyExecuted: boolean;
  developer: {
    name: string;
    email: string;
    companyName: string | null;
    signedAt: string;
    signatureDataUrl: string | null;
  };
  companyReceipt: {
    name: string;
    email: string;
    companyName: string | null;
    title: string | null;
    signedAt: string;
    signatureDataUrl: string | null;
  } | null;
  document: {
    title: string;
    description: string;
    documentNumber: string | null;
  };
  version: {
    versionLabel: string;
    bodyHtml: string;
    effectiveAt: string;
  };
  companyDefaults: {
    legalName: string;
    title: string;
    email: string;
    organizationName: string;
  };
};

const initialState: AgreementActionState = { error: null, success: false };

export function CountersignClient({
  detail,
  queue,
  done,
}: {
  detail: Detail | null;
  queue: Array<{
    id: string;
    developerName: string;
    documentTitle: string;
    versionLabel: string;
    fullyExecuted: boolean;
  }>;
  done?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolledComplete, setScrolledComplete] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [typedLegalName, setTypedLegalName] = useState(
    detail?.companyDefaults.legalName ?? "",
  );
  const [companyEmail, setCompanyEmail] = useState(
    detail?.companyDefaults.email ?? "",
  );
  const [companyOrganizationName, setCompanyOrganizationName] = useState(
    detail?.companyDefaults.organizationName ?? "Hey Ralli, LLC",
  );
  const [companyTitle, setCompanyTitle] = useState(
    detail?.companyDefaults.title ?? "Authorized Representative",
  );
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    countersignCompanyAgreementAction,
    initialState,
  );

  useEffect(() => {
    setTypedLegalName(detail?.companyDefaults.legalName ?? "");
    setCompanyEmail(detail?.companyDefaults.email ?? "");
    setCompanyOrganizationName(
      detail?.companyDefaults.organizationName ?? "Hey Ralli, LLC",
    );
    setCompanyTitle(
      detail?.companyDefaults.title ?? "Authorized Representative",
    );
    setConfirmed(false);
    setSignatureDataUrl(null);
    setScrolledComplete(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [
    detail?.signatureId,
    detail?.companyDefaults.legalName,
    detail?.companyDefaults.title,
    detail?.companyDefaults.email,
    detail?.companyDefaults.organizationName,
  ]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !detail) return;
    const check = () => {
      const reached =
        el.scrollHeight <= el.clientHeight + 8 ||
        el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
      if (reached) setScrolledComplete(true);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [detail?.signatureId, detail?.version.bodyHtml]);

  const pendingQueue = queue.filter((item) => !item.fullyExecuted);

  if (!detail) {
    return (
      <AgreementThemeShell eyebrow="Company counter-sign">
        <h1 className="font-serif text-3xl text-cos-text md:text-4xl">
          Company counter-sign
        </h1>
        {done && (
          <p className="mt-4 rounded-xl border border-cos-success/30 bg-cos-success-bg px-4 py-3 text-sm text-cos-success-text">
            Counter-signature saved. Fully executed copies were emailed to
            everyone.
          </p>
        )}
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
          {pendingQueue.length
            ? "Select an agreement waiting for your signature."
            : "No agreements are waiting for a Hey Ralli counter-signature."}
        </p>
        <ul className="mt-8 divide-y divide-cos-border rounded-2xl border border-cos-border bg-cos-card shadow-sm">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-cos-text">{item.documentTitle}</p>
                <p className="text-cos-muted">
                  {item.developerName} · {item.versionLabel}
                </p>
              </div>
              {item.fullyExecuted ? (
                <a
                  className="font-medium text-cos-primary underline"
                  href={`/api/developer-agreements/download?id=${item.id}`}
                >
                  Download
                </a>
              ) : (
                <a
                  className="font-medium text-cos-primary underline"
                  href={`/account/agreements/countersign?id=${item.id}`}
                >
                  Sign
                </a>
              )}
            </li>
          ))}
        </ul>
      </AgreementThemeShell>
    );
  }

  if (detail.fullyExecuted) {
    return (
      <AgreementThemeShell eyebrow="Company counter-sign">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cos-brand-terracotta">
          Fully executed
        </p>
        <h1 className="mt-2 font-serif text-3xl text-cos-text md:text-4xl">
          {detail.document.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
          Already fully executed for {detail.developer.name}.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <SignedPartyCard
            party={{
              roleLabel: "Contributor",
              legalName: detail.developer.name,
              email: detail.developer.email,
              companyName: detail.developer.companyName,
              signedAt: detail.developer.signedAt,
              signatureDataUrl: detail.developer.signatureDataUrl,
            }}
          />
          {detail.companyReceipt ? (
            <SignedPartyCard
              party={{
                roleLabel: "Hey Ralli, LLC",
                legalName: detail.companyReceipt.name,
                email: detail.companyReceipt.email,
                companyName: detail.companyReceipt.companyName,
                title: detail.companyReceipt.title,
                signedAt: detail.companyReceipt.signedAt,
                signatureDataUrl: detail.companyReceipt.signatureDataUrl,
              }}
            />
          ) : null}
        </div>

        <a
          className="mt-6 inline-block text-sm font-medium text-cos-primary underline"
          href={`/api/developer-agreements/download?id=${detail.signatureId}`}
        >
          Download executed copy
        </a>
      </AgreementThemeShell>
    );
  }

  const canSubmit =
    scrolledComplete &&
    confirmed &&
    typedLegalName.trim().length >= 2 &&
    companyEmail.includes("@") &&
    Boolean(signatureDataUrl) &&
    !pending;

  return (
    <AgreementThemeShell eyebrow="Company counter-sign">
      <h1 className="font-serif text-3xl tracking-tight text-cos-text md:text-4xl">
        Counter-sign for Hey Ralli, LLC
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
        {detail.developer.name} already signed {detail.document.title}. Review
        the agreement and add the company signature. When you finish, a full
        executed copy is emailed to everyone.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <section className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cos-brand-terracotta">
            Company signature required
          </p>
          <h2 className="mt-2 font-serif text-2xl text-cos-text">
            {detail.document.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-cos-muted">
            {detail.document.description}
          </p>
          <div
            ref={scrollRef}
            className="mt-5 max-h-[28rem] overflow-y-auto rounded-2xl border border-cos-border bg-cos-card p-5 text-sm leading-relaxed text-cos-text shadow-sm [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-lg [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-base [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: detail.version.bodyHtml }}
          />
        </section>

        <aside className="space-y-5 rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
          <dl className="space-y-2 text-sm text-cos-muted">
            <div className="flex justify-between gap-3">
              <dt>Version</dt>
              <dd className="text-right font-medium text-cos-text">
                {detail.version.versionLabel}
              </dd>
            </div>
            {detail.document.documentNumber ? (
              <div className="flex justify-between gap-3">
                <dt>Document</dt>
                <dd className="text-right font-medium text-cos-text">
                  {detail.document.documentNumber}
                </dd>
              </div>
            ) : null}
          </dl>

          <SignedPartyCard
            party={{
              roleLabel: "Contributor",
              legalName: detail.developer.name,
              email: detail.developer.email,
              companyName: detail.developer.companyName,
              signedAt: detail.developer.signedAt,
              signatureDataUrl: detail.developer.signatureDataUrl,
            }}
          />

          <form action={action} className="space-y-4">
            <input type="hidden" name="signatureId" value={detail.signatureId} />
            <input
              type="hidden"
              name="scrolledComplete"
              value={scrolledComplete ? "true" : "false"}
            />
            <input
              type="hidden"
              name="signatureDataUrl"
              value={signatureDataUrl ?? ""}
            />

            <label className="flex items-start gap-3 text-sm leading-snug text-cos-text">
              <input
                type="checkbox"
                name="confirmation"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={!scrolledComplete}
                className="mt-1"
              />
              <span>
                I confirm I am authorized to sign for Hey Ralli, LLC and agree to
                the complete terms of this agreement.
              </span>
            </label>

            <Input
              name="typedLegalName"
              label="Full legal name"
              value={typedLegalName}
              onChange={(event) => setTypedLegalName(event.target.value)}
              disabled={!scrolledComplete}
              required
              autoComplete="name"
            />
            <Input
              name="companyEmail"
              label="Email"
              type="email"
              value={companyEmail}
              onChange={(event) => setCompanyEmail(event.target.value)}
              disabled={!scrolledComplete}
              required
              autoComplete="email"
            />
            <Input
              name="companyOrganizationName"
              label="Company name (optional)"
              value={companyOrganizationName}
              onChange={(event) =>
                setCompanyOrganizationName(event.target.value)
              }
              disabled={!scrolledComplete}
              autoComplete="organization"
            />
            <Input
              name="companyTitle"
              label="Title"
              value={companyTitle}
              onChange={(event) => setCompanyTitle(event.target.value)}
              disabled={!scrolledComplete}
            />

            <SignaturePad
              onChange={setSignatureDataUrl}
              disabled={!scrolledComplete}
            />

            <div className="rounded-lg border border-cos-accent/40 bg-cos-accent-soft/50 px-3 py-3 text-xs leading-relaxed text-cos-muted">
              <p className="flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Your typed name and drawn signature are the company&apos;s legal
                electronic signature. Timestamp, IP, and agreement version may be
                recorded.
              </p>
            </div>

            {state.error && (
              <p className="text-sm text-cos-error-text">{state.error}</p>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              Sign for Hey Ralli
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </aside>
      </div>
    </AgreementThemeShell>
  );
}
