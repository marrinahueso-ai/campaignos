"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  Lock,
  Shield,
  Users,
  FileText,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignaturePad } from "@/components/developer-agreements/SignaturePad";
import { AgreementThemeShell } from "@/components/developer-agreements/AgreementThemeShell";
import { SignedPartyCard } from "@/components/developer-agreements/SignedPartyCard";
import {
  signDeveloperAgreementAction,
  type AgreementActionState,
} from "@/lib/developer-agreements/actions";
import type { DeveloperAgreementForSigning } from "@/lib/developer-agreements/types";

type Props = {
  documents: DeveloperAgreementForSigning[];
  developerName: string;
  developerEmail: string;
  justSigned?: boolean;
};

const initialState: AgreementActionState = {
  error: null,
  success: false,
};

export function DeveloperAgreementsClient({
  documents,
  developerName,
  developerEmail,
  justSigned = false,
}: Props) {
  const firstUnsignedIndex = Math.max(
    0,
    documents.findIndex((doc) => !doc.signed),
  );
  const [activeIndex, setActiveIndex] = useState(
    firstUnsignedIndex === -1 ? 0 : firstUnsignedIndex,
  );
  const active = documents[activeIndex] ?? null;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolledComplete, setScrolledComplete] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [typedLegalName, setTypedLegalName] = useState(developerName);
  const [signerEmail, setSignerEmail] = useState(developerEmail);
  const [signerCompanyName, setSignerCompanyName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    signDeveloperAgreementAction,
    initialState,
  );

  useEffect(() => {
    setScrolledComplete(false);
    setConfirmed(false);
    setSignatureDataUrl(null);
    setTypedLegalName(active?.receipt?.legalName || developerName);
    setSignerEmail(active?.receipt?.email || developerEmail);
    setSignerCompanyName(active?.receipt?.companyName || "");
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [active?.id, active?.receipt, developerName, developerEmail]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !active) return;

    const check = () => {
      const reached =
        el.scrollHeight <= el.clientHeight + 8 ||
        el.scrollTop + el.clientHeight >= el.scrollHeight - 12;
      if (reached) setScrolledComplete(true);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [active?.id, active?.version.bodyHtml]);

  const steps = useMemo(() => {
    const docSteps = documents.map((doc, index) => ({
      key: doc.slug,
      label:
        doc.slug === "nda"
          ? "NDA"
          : doc.slug === "ip-assignment"
            ? "IP Agreement"
            : doc.title,
      done: doc.signed,
      current: index === activeIndex && !doc.signed,
    }));
    const allSigned = documents.every((doc) => doc.signed);
    return [
      { key: "identity", label: "Identity", done: true, current: false },
      ...docSteps,
      {
        key: "complete",
        label: "Complete",
        done: allSigned,
        current: allSigned,
      },
    ];
  }, [documents, activeIndex]);

  if (!active) {
    return (
      <AgreementThemeShell eyebrow="Secure onboarding">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-serif text-3xl text-cos-text">You&apos;re all set</h1>
          <p className="mt-3 text-cos-muted">
            No developer agreements are required for your account right now.
          </p>
        </div>
      </AgreementThemeShell>
    );
  }

  const agreementIndexLabel = `Required agreement ${activeIndex + 1} of ${documents.length}`;
  const canSubmit =
    scrolledComplete &&
    confirmed &&
    typedLegalName.trim().length >= 2 &&
    signerEmail.includes("@") &&
    Boolean(signatureDataUrl) &&
    !active.signed &&
    !pending;

  const effectiveDate = new Date(active.version.effectiveAt).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <AgreementThemeShell
      eyebrow="Secure onboarding"
      footer={
        <footer className="mt-4 border-t border-cos-border bg-cos-card/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <p className="flex items-center gap-2 font-medium text-cos-text">
                <Shield className="h-4 w-4 text-cos-success" />
                Your data is secure.
              </p>
              <p className="mt-2 text-sm text-cos-muted">
                Signed agreements are stored securely and are only accessible by
                authorized administrators.
              </p>
            </div>
            <ul className="flex flex-wrap gap-6 text-sm text-cos-muted">
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Encrypted transmission
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Access controlled
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Audit recorded
              </li>
            </ul>
          </div>
        </footer>
      }
    >
      <h1 className="font-serif text-3xl tracking-tight text-cos-text md:text-4xl">
        Complete your developer agreements.
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
        Before accessing Hey Ralli systems, code, customer information, or
        internal documentation, please review and sign both required agreements.
      </p>

      {justSigned && (
        <p className="mt-4 rounded-xl border border-cos-success/30 bg-cos-success-bg px-4 py-3 text-sm text-cos-success-text">
          Signature saved. Continue with the next agreement.
        </p>
      )}

      <ol className="mt-8 flex flex-wrap items-center gap-4 border-b border-cos-border pb-6">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            <span
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                step.done
                  ? "bg-cos-success text-white"
                  : step.current
                    ? "bg-cos-primary text-[#f6f2eb]"
                    : "bg-cos-accent-soft text-cos-muted",
              ].join(" ")}
            >
              {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={
                step.current || step.done
                  ? "font-medium text-cos-text"
                  : "text-cos-muted"
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <section className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cos-brand-terracotta">
            {agreementIndexLabel}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-cos-text">{active.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-cos-muted">
            {active.description}
          </p>

          <div className="mt-4">
            <a
              href={`data:text/html;charset=utf-8,${encodeURIComponent(active.version.bodyHtml)}`}
              download={`${active.slug}-${active.version.versionLabel}.html`}
              className="inline-flex items-center gap-2 rounded-lg border border-cos-border bg-cos-card px-3 py-2 text-sm font-medium text-cos-text hover:bg-cos-bg"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Download
            </a>
          </div>

          <div
            ref={scrollRef}
            className="mt-5 max-h-[28rem] overflow-y-auto rounded-2xl border border-cos-border bg-cos-card p-5 text-sm leading-relaxed text-cos-text shadow-sm [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-lg [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-base [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: active.version.bodyHtml }}
          />

          <p className="mt-3 flex items-start gap-2 text-xs text-cos-success-text">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Please read the complete agreement carefully. You must scroll to the
            bottom to enable the signature section.
          </p>
        </section>

        <aside className="space-y-5 rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-cos-text">
              Agreement details
            </h3>
            <dl className="mt-3 space-y-2 text-sm text-cos-muted">
              <div className="flex justify-between gap-3">
                <dt>Role</dt>
                <dd className="text-right font-medium text-cos-text">
                  Developer
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Version</dt>
                <dd className="text-right font-medium text-cos-text">
                  {active.version.versionLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Effective date</dt>
                <dd className="text-right font-medium text-cos-text">
                  {effectiveDate}
                </dd>
              </div>
            </dl>
          </div>

          {active.signed && active.receipt ? (
            <SignedPartyCard
              party={{
                roleLabel: "Contributor",
                legalName: active.receipt.legalName,
                email: active.receipt.email,
                companyName: active.receipt.companyName,
                signedAt: active.receipt.signedAt,
                signatureDataUrl: active.receipt.signatureDataUrl,
              }}
            />
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="versionId" value={active.version.id} />
              <input type="hidden" name="documentId" value={active.id} />
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
                  I confirm that I have read, understand, and agree to the
                  complete terms of this agreement.
                </span>
              </label>

              <Input
                name="typedLegalName"
                label="Full legal name"
                value={typedLegalName}
                onChange={(event) => setTypedLegalName(event.target.value)}
                required
                disabled={!scrolledComplete}
                autoComplete="name"
              />
              <Input
                name="signerEmail"
                label="Email"
                type="email"
                value={signerEmail}
                onChange={(event) => setSignerEmail(event.target.value)}
                required
                disabled={!scrolledComplete}
                autoComplete="email"
              />
              <Input
                name="signerCompanyName"
                label="Company name (optional)"
                value={signerCompanyName}
                onChange={(event) => setSignerCompanyName(event.target.value)}
                disabled={!scrolledComplete}
                autoComplete="organization"
              />

              <SignaturePad
                onChange={setSignatureDataUrl}
                disabled={!scrolledComplete}
              />

              <div className="rounded-lg border border-cos-accent/40 bg-cos-accent-soft/50 px-3 py-3 text-xs leading-relaxed text-cos-muted">
                <p className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  By selecting &ldquo;Sign and Continue,&rdquo; you agree that
                  your typed name and drawn signature are your legal electronic
                  signature. Your account, timestamp, IP address, and agreement
                  version may be recorded.
                </p>
              </div>

              {state.error && (
                <p className="text-sm text-cos-error-text">{state.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                Sign and Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          <div className="flex flex-col gap-2">
            {activeIndex > 0 && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {active.signed && activeIndex < documents.length - 1 && (
              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  setActiveIndex((index) =>
                    Math.min(documents.length - 1, index + 1),
                  )
                }
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-xs text-cos-muted">
            Questions about these agreements? Contact the Hey Ralli account
            administrator.
          </p>
        </aside>
      </div>
    </AgreementThemeShell>
  );
}
