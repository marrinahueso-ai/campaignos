import { Check } from "lucide-react";
import { formatAgreementDateTime } from "@/components/developer-agreements/AgreementThemeShell";

export type SignedPartyDisplay = {
  roleLabel: string;
  legalName: string;
  email: string;
  companyName?: string | null;
  title?: string | null;
  signedAt: string;
  signatureDataUrl?: string | null;
};

export function SignedPartyCard({ party }: { party: SignedPartyDisplay }) {
  return (
    <div className="rounded-xl border border-cos-success/30 bg-cos-success-bg/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-cos-success-text">
        <Check className="h-3.5 w-3.5" />
        {party.roleLabel} signed
      </p>
      <dl className="mt-3 space-y-2 text-sm text-cos-muted">
        <div className="flex justify-between gap-3">
          <dt>Full name</dt>
          <dd className="text-right font-medium text-cos-text">
            {party.legalName}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Email</dt>
          <dd className="text-right font-medium text-cos-text break-all">
            {party.email || "—"}
          </dd>
        </div>
        {party.companyName ? (
          <div className="flex justify-between gap-3">
            <dt>Company</dt>
            <dd className="text-right font-medium text-cos-text">
              {party.companyName}
            </dd>
          </div>
        ) : null}
        {party.title ? (
          <div className="flex justify-between gap-3">
            <dt>Title</dt>
            <dd className="text-right font-medium text-cos-text">
              {party.title}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt>Signed</dt>
          <dd className="text-right font-medium text-cos-text">
            {formatAgreementDateTime(party.signedAt)}
          </dd>
        </div>
      </dl>
      {party.signatureDataUrl ? (
        <div className="mt-4 rounded-lg border border-cos-border bg-white px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cos-muted">
            Signature
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={party.signatureDataUrl}
            alt={`Signature of ${party.legalName}`}
            className="mt-2 max-h-20 w-auto max-w-full"
          />
        </div>
      ) : null}
    </div>
  );
}
