"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  signInWithEmailAction,
  submitFoundingAccessCodeAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";
import {
  MarketingAuthBackLink,
  MarketingAuthLegalNote,
} from "@/components/marketing-wow/MarketingAuthCardShell";
import {
  AuthErrorMessage,
  AuthSuccessMessage,
  authInputClassName,
  authLabelClassName,
  authPrimaryButtonClassName,
  authSubClassName,
  authTitleClassName,
} from "@/components/marketing-wow/marketing-auth-ui";
import {
  formatPlanPrice,
  PAID_PLANS,
  type PaidPlanId,
  planById,
} from "@/lib/billing/plan-catalog";

const initialState: AuthActionState = {
  error: null,
  success: false,
  message: null,
};

interface MarketingWowSignupFormProps {
  defaultEmail?: string;
  nextPath?: string | null;
  selectedPlanId?: PaidPlanId | null;
  foundingCodeRetry?: boolean;
  foundingFocused?: boolean;
  authErrorMessage?: string | null;
}

export function MarketingWowSignupForm({
  defaultEmail = "",
  nextPath = ONBOARDING_PATH,
  selectedPlanId = null,
  foundingCodeRetry = false,
  foundingFocused = false,
  authErrorMessage = null,
}: MarketingWowSignupFormProps) {
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithEmailAction,
    initialState,
  );
  const [retryState, retryAction, retryPending] = useActionState(
    submitFoundingAccessCodeAction,
    initialState,
  );

  const showCheckout = foundingCodeRetry || Boolean(selectedPlanId);
  const pending = foundingCodeRetry ? retryPending : magicPending;
  const state = foundingCodeRetry ? retryState : magicState;
  const selectedPlan = selectedPlanId ? planById(selectedPlanId) : null;

  if (!showCheckout) {
    return (
      <>
        <MarketingAuthBackLink
          href="/signup/welcome"
          label="Back to welcome"
        />

        <h1 className={`${authTitleClassName} mt-4`}>Choose your plan</h1>
        <p className={`${authSubClassName} mb-8`}>
          Create a Hey Ralli workspace for your PTA or school. You’ll enter your
          founding access code next.
        </p>

        <AuthErrorMessage>{authErrorMessage}</AuthErrorMessage>

        <div className="mt-6 space-y-3" role="list">
          {PAID_PLANS.map((plan) => {
            const href = `/signup?plan=${plan.id}${
              nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""
            }`;
            return (
              <Link
                key={plan.id}
                href={href}
                role="listitem"
                className={`block rounded-2xl border px-5 py-5 text-left transition-colors ${
                  plan.highlighted
                    ? "border-cos-brand-sage bg-cos-brand-sage-soft/40"
                    : "border-cos-border hover:border-cos-brand-sage/50 hover:bg-cos-bg-alt/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="text-sm font-bold text-cos-text">
                    {plan.name}
                  </strong>
                  <span className="text-sm font-bold text-cos-text">
                    {formatPlanPrice(plan.priceUsd)}
                    <span className="font-medium text-cos-muted">/mo</span>
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                  {plan.features.slice(0, 3).join(" · ")}
                </p>
                {plan.badge ? (
                  <p className="mt-2 text-[10px] font-bold tracking-widest text-cos-brand-sage uppercase">
                    {plan.badge}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>

        <p className="mt-8 rounded-2xl border border-cos-border bg-cos-bg-alt/40 px-4 py-3 text-sm leading-relaxed text-cos-muted">
          Already invited to a team? Don’t sign up here — open your invite link
          from email instead.
        </p>
        <p className="mt-6 text-center text-sm text-cos-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-cos-text hover:underline">
            Log in
          </Link>
        </p>
        <MarketingAuthLegalNote />
      </>
    );
  }

  const changePlanHref = `/signup${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
  }`;
  const backHref = foundingFocused
    ? "/signup/welcome?path=founding"
    : changePlanHref;

  return (
    <>
      <MarketingAuthBackLink
        href={backHref}
        label={foundingFocused ? "Back to welcome" : "Change plan"}
      />

      <h1 className={`${authTitleClassName} mt-4`}>
        {foundingCodeRetry
          ? "Confirm access code"
          : foundingFocused
            ? "Activate Founding School"
            : "Activate your school"}
      </h1>
      <p className={`${authSubClassName} mb-8`}>
        {foundingCodeRetry
          ? "Your sign-in link worked. Re-enter your founding access code to continue organization setup."
          : foundingFocused
            ? "Enter your Founding School code and email. We’ll send a secure start link."
            : "Confirm your plan, enter your founding access code, and we’ll email a start link."}
      </p>

      <AuthErrorMessage>{authErrorMessage}</AuthErrorMessage>

      {selectedPlan && !foundingCodeRetry ? (
        <div className="mb-6 rounded-2xl border border-cos-border bg-cos-bg-alt/40 px-4 py-4">
          <p className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
            Selected plan
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <strong className="text-sm text-cos-text">{selectedPlan.name}</strong>
            <span className="text-sm font-bold text-cos-text">
              {formatPlanPrice(selectedPlan.priceUsd)}/mo
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-cos-muted">
            A valid founding code applies founding-partner access (billing
            waived) when you complete setup.
          </p>
        </div>
      ) : null}

      {foundingCodeRetry ? (
        <form action={retryAction} className="space-y-5">
          <div>
            <label htmlFor="signup-code" className={authLabelClassName}>
              Founding access code
            </label>
            <input
              id="signup-code"
              name="accessCode"
              type="text"
              autoComplete="off"
              placeholder="Your partner code"
              required
              className={authInputClassName}
            />
          </div>
          <button
            type="submit"
            className={authPrimaryButtonClassName}
            disabled={pending}
          >
            {pending ? "Verifying…" : "Continue to organization setup"}
          </button>
        </form>
      ) : (
        <form action={magicAction} className="space-y-5">
          {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
          <input type="hidden" name="setupIntent" value="true" />
          {selectedPlanId ? (
            <input type="hidden" name="plan" value={selectedPlanId} />
          ) : null}
          <div>
            <label htmlFor="signup-email" className={authLabelClassName}>
              Work email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="president@yourpto.org"
              defaultValue={defaultEmail}
              required
              className={authInputClassName}
            />
          </div>
          <div>
            <label htmlFor="signup-code" className={authLabelClassName}>
              Founding access code
            </label>
            <input
              id="signup-code"
              name="accessCode"
              type="text"
              autoComplete="off"
              placeholder="Your partner code"
              required
              className={authInputClassName}
            />
          </div>
          <button
            type="submit"
            className={authPrimaryButtonClassName}
            disabled={pending}
          >
            {pending ? "Sending…" : "Email me a start link"}
          </button>
        </form>
      )}

      <AuthErrorMessage>{state.error}</AuthErrorMessage>
      <AuthSuccessMessage>
        {state.success ? state.message : null}
      </AuthSuccessMessage>

      {!foundingCodeRetry ? (
        <>
          <p className="mt-6 text-center text-sm text-cos-muted">
            {!foundingFocused ? (
              <>
                <Link
                  href={changePlanHref}
                  className="font-bold text-cos-text hover:underline"
                >
                  ← Change plan
                </Link>
                {" · "}
              </>
            ) : null}
            Need a code?{" "}
            <a
              className="font-bold text-cos-text hover:underline"
              href="mailto:hello@heyralli.com"
            >
              Contact us
            </a>
          </p>
          <p className="mt-4 rounded-2xl border border-cos-border bg-cos-bg-alt/40 px-4 py-3 text-sm leading-relaxed text-cos-muted">
            Joining an existing team? Use your invite link instead of founding a
            new organization.
          </p>
          <p className="mt-6 text-center text-sm text-cos-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-cos-text hover:underline">
              Log in
            </Link>
          </p>
        </>
      ) : null}

      <MarketingAuthLegalNote />
    </>
  );
}
