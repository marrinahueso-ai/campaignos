"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  acceptCurrentLegalDocumentsAction,
  type LegalAcceptanceActionState,
} from "@/lib/legal/actions";
import { Button } from "@/components/ui/Button";

const initialState: LegalAcceptanceActionState = { error: null };

export function LegalAcceptanceGate({ nextPath }: { nextPath: string | null }) {
  const [state, action, pending] = useActionState(
    acceptCurrentLegalDocumentsAction,
    initialState,
  );

  return (
    <>
      <h1 className="font-serif text-3xl text-cos-text md:text-4xl">
        Updated Terms of Service
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-cos-muted">
        We&apos;ve updated Hey Ralli&apos;s Terms of Service. Please review and
        accept them to continue using Hey Ralli.
      </p>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cos-muted">
        You can also read our{" "}
        <Link href="/privacy" className="font-semibold text-cos-text underline">
          Privacy Policy
        </Link>
        .
      </p>

      {state.error ? (
        <p className="mt-4 max-w-2xl text-sm text-cos-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <form action={action} className="mt-8 flex flex-wrap items-center gap-3">
        {nextPath ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}
        <Button href="/terms" variant="secondary">
          Review Terms
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Accept & Continue"}
        </Button>
      </form>
    </>
  );
}
