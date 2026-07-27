"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  signInWithEmailAction,
  submitFoundingAccessCodeAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";
import { MarketingWowLegalLinks } from "@/components/marketing-wow/MarketingWowAuthShell";
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
  authErrorMessage?: string | null;
}

export function MarketingWowSignupForm({
  defaultEmail = "",
  nextPath = ONBOARDING_PATH,
  selectedPlanId = null,
  foundingCodeRetry = false,
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
        <h1>Choose your plan</h1>
        <p className="sub">
          Create a Hey Ralli workspace for your PTA or school. You’ll enter your
          founding access code at checkout.
        </p>

        {authErrorMessage ? (
          <p className="mw-msg-error">{authErrorMessage}</p>
        ) : null}

        <div className="signup-plans" role="list">
          {PAID_PLANS.map((plan) => {
            const href = `/signup?plan=${plan.id}${
              nextPath
                ? `&next=${encodeURIComponent(nextPath)}`
                : ""
            }`;
            return (
              <Link
                key={plan.id}
                href={href}
                className={
                  plan.highlighted ? "signup-plan featured" : "signup-plan"
                }
                role="listitem"
              >
                <span className="signup-plan-top">
                  <strong>{plan.name}</strong>
                  <span className="price">
                    {formatPlanPrice(plan.priceUsd)}
                    <span>/mo</span>
                  </span>
                </span>
                <p>{plan.features.slice(0, 3).join(" · ")}</p>
                {plan.badge ? (
                  <span className="signup-plan-badge">{plan.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="invite-callout">
          Already invited to a team? Don’t sign up here — open your invite link
          from email instead.
        </div>
        <p className="auth-alt" style={{ marginTop: 18 }}>
          Already have an account?{" "}
          <Link href="/login" className="btn-text">
            Log in
          </Link>
        </p>

        <MarketingWowLegalLinks />
      </>
    );
  }

  const changePlanHref = `/signup${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
  }`;

  return (
    <>
      <h1>{foundingCodeRetry ? "Confirm access code" : "Checkout"}</h1>
      <p className="sub">
        {foundingCodeRetry
          ? "Your sign-in link worked. Re-enter your founding access code to continue organization setup."
          : "Confirm your plan, enter your founding access code, and we’ll email a start link."}
      </p>

      {authErrorMessage ? (
        <p className="mw-msg-error">{authErrorMessage}</p>
      ) : null}

      {selectedPlan ? (
        <div className="checkout-plan-summary">
          <p className="label">Selected plan</p>
          <div className="row">
            <strong>{selectedPlan.name}</strong>
            <span className="price">
              {formatPlanPrice(selectedPlan.priceUsd)}/mo
            </span>
          </div>
          <p className="hint">
            A valid founding code applies founding-partner access (billing
            waived) when you complete setup.
          </p>
        </div>
      ) : null}

      {foundingCodeRetry ? (
        <form action={retryAction}>
          <div className="field">
            <label htmlFor="signup-code">Founding access code</label>
            <input
              id="signup-code"
              name="accessCode"
              type="text"
              autoComplete="off"
              placeholder="Your partner code"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={pending}
          >
            {pending ? "Verifying…" : "Continue to organization setup"}
          </button>
        </form>
      ) : (
        <form action={magicAction}>
          {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
          <input type="hidden" name="setupIntent" value="true" />
          {selectedPlanId ? (
            <input type="hidden" name="plan" value={selectedPlanId} />
          ) : null}
          <div className="field">
            <label htmlFor="signup-email">Work email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="president@yourpto.org"
              defaultValue={defaultEmail}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="signup-code">Founding access code</label>
            <input
              id="signup-code"
              name="accessCode"
              type="text"
              autoComplete="off"
              placeholder="Your partner code"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={pending}
          >
            {pending ? "Sending…" : "Email me a start link"}
          </button>
        </form>
      )}

      {state.error ? <p className="mw-msg-error">{state.error}</p> : null}
      {state.success && state.message ? (
        <p className="mw-msg-success">{state.message}</p>
      ) : null}

      {!foundingCodeRetry ? (
        <>
          <p className="auth-alt">
            <Link href={changePlanHref} className="btn-text">
              ← Change plan
            </Link>
            {" · "}
            Need a code?{" "}
            <a className="btn-text" href="mailto:hello@heyralli.com">
              Contact us
            </a>
          </p>
          <div className="invite-callout">
            Joining an existing team? Use your invite link instead of founding a
            new organization.
          </div>
          <p className="auth-alt" style={{ marginTop: 18 }}>
            Already have an account?{" "}
            <Link href="/login" className="btn-text">
              Log in
            </Link>
          </p>
        </>
      ) : null}

      <MarketingWowLegalLinks />
    </>
  );
}
