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
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    signDeveloperAgreementAction,
    initialState,
  );

  useEffect(() => {
    setScrolledComplete(false);
    setConfirmed(false);
    setSignatureDataUrl(null);
    setTypedLegalName(developerName);
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [active?.id, developerName]);

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
    const identityDone = true;
    const docSteps = documents.map((doc, index) => ({
      key: doc.slug,
      label: doc.slug === "nda" ? "NDA" : doc.slug === "ip-assignment" ? "IP Agreement" : doc.title,
      done: doc.signed,
      current: index === activeIndex && !doc.signed,
    }));
    const allSigned = documents.every((doc) => doc.signed);
    return [
      { key: "identity", label: "Identity", done: identityDone, current: false },
      ...docSteps,
      { key: "complete", label: "Complete", done: allSigned, current: allSigned },
    ];
  }, [documents, activeIndex]);

  if (!active) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-[#2a2622]">You&apos;re all set</h1>
        <p className="mt-3 text-[#5c554c]">
          No developer agreements are required for your account right now.
        </p>
      </main>
    );
  }

  const agreementIndexLabel = `Required agreement ${activeIndex + 1} of ${documents.length}`;
  const canSubmit =
    scrolledComplete &&
    confirmed &&
    typedLegalName.trim().length >= 2 &&
    Boolean(signatureDataUrl) &&
    !active.signed &&
    !pending;

  const effectiveDate = new Date(active.version.effectiveAt).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <div className="min-h-screen bg-white text-[#2a2622]">
      <header className="border-b border-[#eee7dc]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <p className="font-serif text-xl tracking-tight">Hey Ralli</p>
          <p className="flex items-center gap-2 text-sm text-[#5c554c]">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
            Secure onboarding
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
          Complete your developer agreements.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#5c554c]">
          Before accessing Hey Ralli systems, code, customer information, or
          internal documentation, please review and sign both required
          agreements.
        </p>

        {justSigned && (
          <p className="mt-4 rounded-lg border border-[#cfe0cf] bg-[#eef2ec] px-4 py-3 text-sm text-[#3f5240]">
            Signature saved. Continue with the next agreement.
          </p>
        )}

        <ol className="mt-8 flex flex-wrap items-center gap-4 border-b border-[#eee7dc] pb-6">
          {steps.map((step, index) => (
            <li key={step.key} className="flex items-center gap-2 text-sm">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-[#5f735f] text-white"
                    : step.current
                      ? "bg-[#2a2622] text-white"
                      : "bg-[#efe8dc] text-[#8a8278]",
                ].join(" ")}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={
                  step.current || step.done
                    ? "font-medium text-[#2a2622]"
                    : "text-[#8a8278]"
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <section className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c4784a]">
              {agreementIndexLabel}
            </p>
            <h2 className="mt-2 font-serif text-2xl">{active.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#5c554c]">
              {active.description}
            </p>

            <div className="mt-4">
              <a
                href={`data:text/html;charset=utf-8,${encodeURIComponent(active.version.bodyHtml)}`}
                download={`${active.slug}-${active.version.versionLabel}.html`}
                className="inline-flex items-center gap-2 rounded-lg border border-[#ddd4c8] px-3 py-2 text-sm font-medium text-[#2a2622] hover:bg-[#faf7f2]"
              >
                <Download className="h-4 w-4" strokeWidth={1.75} />
                Download
              </a>
            </div>

            <div
              ref={scrollRef}
              className="mt-5 max-h-[28rem] overflow-y-auto rounded-xl border border-[#ddd4c8] bg-[#fffcf7] p-5 text-sm leading-relaxed text-[#3a342e] [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-lg [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-base [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: active.version.bodyHtml }}
            />

            <p className="mt-3 flex items-start gap-2 text-xs text-[#5f735f]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Please read the complete agreement carefully. You must scroll to
              the bottom to enable the signature section.
            </p>
          </section>

          <aside className="space-y-5 rounded-xl border border-[#eee7dc] bg-[#fffcf7] p-5">
            <div>
              <h3 className="text-sm font-semibold">Agreement details</h3>
              <dl className="mt-3 space-y-2 text-sm text-[#5c554c]">
                <div className="flex justify-between gap-3">
                  <dt>Developer</dt>
                  <dd className="text-right font-medium text-[#2a2622]">
                    {developerName || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Email</dt>
                  <dd className="text-right font-medium text-[#2a2622]">
                    {developerEmail || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Role</dt>
                  <dd className="text-right font-medium text-[#2a2622]">
                    Developer
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Company</dt>
                  <dd className="text-right font-medium text-[#2a2622]">
                    Hey Ralli, LLC
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Version</dt>
                  <dd className="text-right font-medium text-[#2a2622]">
                    {active.version.versionLabel}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Effective date</dt>
                  <dd className="text-right font-medium text-[#2a2622]">
                    {effectiveDate}
                  </dd>
                </div>
              </dl>
            </div>

            {active.signed ? (
              <div className="rounded-lg border border-[#cfe0cf] bg-[#eef2ec] px-4 py-3 text-sm text-[#3f5240]">
                You already signed this version. Use Continue for the next step.
              </div>
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

                <label className="flex items-start gap-3 text-sm leading-snug text-[#2a2622]">
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

                <SignaturePad
                  onChange={setSignatureDataUrl}
                  disabled={!scrolledComplete}
                />

                <div className="rounded-lg border border-[#e6dccb] bg-[#f6efe4] px-3 py-3 text-xs leading-relaxed text-[#5c554c]">
                  <p className="flex items-start gap-2">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    By selecting &ldquo;Sign and Continue,&rdquo; you agree that
                    your typed name and drawn signature are your legal
                    electronic signature. Your account, timestamp, IP address,
                    and agreement version may be recorded.
                  </p>
                </div>

                {state.error && (
                  <p className="text-sm text-[#8f4a38]">{state.error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit}
                >
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

            <p className="text-xs text-[#8a8278]">
              Questions about these agreements? Contact the Hey Ralli account
              administrator.
            </p>
          </aside>
        </div>
      </main>

      <footer className="mt-8 border-t border-[#eee7dc] bg-[#fffcf7]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="flex items-center gap-2 font-medium">
              <Shield className="h-4 w-4 text-[#5f735f]" />
              Your data is secure.
            </p>
            <p className="mt-2 text-sm text-[#5c554c]">
              Signed agreements are stored securely and are only accessible by
              authorized administrators.
            </p>
          </div>
          <ul className="flex flex-wrap gap-6 text-sm text-[#5c554c]">
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
    </div>
  );
}
