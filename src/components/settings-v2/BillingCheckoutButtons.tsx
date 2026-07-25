"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AiReserveSkuId } from "@/lib/ai/credit-constants";
import {
  createBillingPortalSession,
  createPlanCheckoutSession,
  createReserveCheckoutSession,
} from "@/lib/billing/actions";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type PlanCheckoutButtonProps = {
  planId: PaidPlanId;
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  returnPath?: string;
};

export function PlanCheckoutButton({
  planId,
  label,
  disabled,
  variant = "primary",
  size = "md",
  className,
  returnPath,
}: PlanCheckoutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full space-y-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("w-full", className)}
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createPlanCheckoutSession(planId, {
              returnPath,
            });
            if (!result.success) {
              setError(result.error);
              return;
            }
            router.push(result.url);
          });
        }}
      >
        {pending ? "Redirecting…" : label}
      </Button>
      {error ? (
        <p className="text-xs text-cos-error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type ReserveCheckoutButtonProps = {
  sku: AiReserveSkuId;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  returnPath?: string;
  variant?: "primary" | "secondary";
};

export function ReserveCheckoutButton({
  sku,
  label,
  size = "md",
  className,
  returnPath,
  variant = "secondary",
}: ReserveCheckoutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full space-y-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("w-full", className)}
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createReserveCheckoutSession(sku, {
              returnPath,
            });
            if (!result.success) {
              setError(result.error);
              return;
            }
            router.push(result.url);
          });
        }}
      >
        {pending ? "Redirecting…" : label}
      </Button>
      {error ? (
        <p className="text-xs text-cos-error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BillingPortalButton({
  label = "Manage billing in Stripe",
  disabled,
}: {
  label?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createBillingPortalSession();
            if (!result.success) {
              setError(result.error);
              return;
            }
            router.push(result.url);
          });
        }}
      >
        {pending ? "Opening…" : label}
      </Button>
      {error ? (
        <p className="text-xs text-cos-error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
