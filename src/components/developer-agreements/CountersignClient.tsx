"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignaturePad } from "@/components/developer-agreements/SignaturePad";
import {
  countersignCompanyAgreementAction,
  type AgreementActionState,
} from "@/lib/developer-agreements/actions";

type Detail = {
  signatureId: string;
  fullyExecuted: boolean;
  developer: { name: string; email: string; signedAt: string };
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
  companyDefaults: { legalName: string; title: string };
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
    setCompanyTitle(
      detail?.companyDefaults.title ?? "Authorized Representative",
    );
    setConfirmed(false);
    setSignatureDataUrl(null);
    setScrolledComplete(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [detail?.signatureId, detail?.companyDefaults.legalName, detail?.companyDefaults.title]);

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
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-3xl">Company counter-sign</h1>
        {done && (
          <p className="mt-4 rounded-lg border border-[#cfe0cf] bg-[#eef2ec] px-4 py-3 text-sm text-[#3f5240]">
            Counter-signature saved. Fully executed copies were emailed to
            everyone.
          </p>
        )}
        <p className="mt-3 text-sm text-[#5c554c]">
          {pendingQueue.length
            ? "Select an agreement waiting for your signature."
            : "No agreements are waiting for a Hey Ralli counter-signature."}
        </p>
        <ul className="mt-6 divide-y divide-[#eee7dc] rounded-xl border border-[#ddd4c8] bg-white">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.documentTitle}</p>
                <p className="text-[#5c554c]">
                  {item.developerName} · {item.versionLabel}
                </p>
              </div>
              {item.fullyExecuted ? (
                <a
                  className="underline"
                  href={`/api/developer-agreements/download?id=${item.id}`}
                >
                  Download
                </a>
              ) : (
                <a
                  className="font-medium underline"
                  href={`/account/agreements/countersign?id=${item.id}`}
                >
                  Sign
                </a>
              )}
            </li>
          ))}
        </ul>
      </main>
    );
  }

  if (detail.fullyExecuted) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-3xl">{detail.document.title}</h1>
        <p className="mt-3 text-sm text-[#5c554c]">
          Already fully executed for {detail.developer.name}.
        </p>
        <a
          className="mt-4 inline-block text-sm font-medium underline"
          href={`/api/developer-agreements/download?id=${detail.signatureId}`}
        >
          Download executed copy
        </a>
      </main>
    );
  }

  const canSubmit =
    scrolledComplete &&
    confirmed &&
    typedLegalName.trim().length >= 2 &&
    Boolean(signatureDataUrl) &&
    !pending;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#eee7dc]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <p className="font-serif text-xl">Hey Ralli</p>
          <p className="flex items-center gap-2 text-sm text-[#5c554c]">
            <Lock className="h-3.5 w-3.5" />
            Company counter-sign
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-serif text-3xl md:text-4xl">
          Counter-sign for Hey Ralli, LLC
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#5c554c]">
          {detail.developer.name} ({detail.developer.email}) already signed{" "}
          {detail.document.title}. Review the agreement and add the company
          signature. When you finish, a full executed copy is emailed to
          everyone.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c4784a]">
              Company signature required
            </p>
            <h2 className="mt-2 font-serif text-2xl">{detail.document.title}</h2>
            <p className="mt-2 text-sm text-[#5c554c]">
              {detail.document.description}
            </p>
            <div
              ref={scrollRef}
              className="mt-5 max-h-[28rem] overflow-y-auto rounded-xl border border-[#ddd4c8] bg-[#fffcf7] p-5 text-sm leading-relaxed [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: detail.version.bodyHtml }}
            />
          </section>

          <aside className="space-y-4 rounded-xl border border-[#eee7dc] bg-[#fffcf7] p-5">
            <dl className="space-y-2 text-sm text-[#5c554c]">
              <div className="flex justify-between gap-3">
                <dt>Developer</dt>
                <dd className="font-medium text-[#2a2622]">
                  {detail.developer.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Version</dt>
                <dd className="font-medium text-[#2a2622]">
                  {detail.version.versionLabel}
                </dd>
              </div>
            </dl>

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

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="confirmation"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={!scrolledComplete}
                  className="mt-1"
                />
                <span>
                  I confirm I am authorized to sign for Hey Ralli, LLC and agree
                  to the complete terms of this agreement.
                </span>
              </label>

              <Input
                name="typedLegalName"
                label="Full legal name"
                value={typedLegalName}
                onChange={(event) => setTypedLegalName(event.target.value)}
                disabled={!scrolledComplete}
                required
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

              {state.error && (
                <p className="text-sm text-[#8f4a38]">{state.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                Sign for Hey Ralli
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
