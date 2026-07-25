"use client";

import {
  PlanCheckoutButton,
  ReserveCheckoutButton,
} from "@/components/settings-v2/BillingCheckoutButtons";
import { Button } from "@/components/ui/Button";
import type { AiReserveSkuId } from "@/lib/ai/credit-constants";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import { cn } from "@/lib/utils/cn";

const PRICING_RETURN = "/pricing";

type PlanCtaProps = {
  planId: PaidPlanId;
  label: string;
  highlighted?: boolean;
  mode: "checkout" | "signin" | "billing" | "founding" | "current";
  href?: string;
};

export function MarketingPlanCta({
  planId,
  label,
  highlighted,
  mode,
  href,
}: PlanCtaProps) {
  const highlightedClass = highlighted
    ? "border-cos-dark-muted/30 bg-[#f6f2eb] text-cos-text hover:bg-white"
    : undefined;

  if (mode === "checkout") {
    return (
      <PlanCheckoutButton
        planId={planId}
        label={label}
        size="lg"
        variant={highlighted ? "secondary" : "primary"}
        className={cn("mt-10", highlightedClass)}
        returnPath={PRICING_RETURN}
      />
    );
  }

  if (mode === "current") {
    return (
      <Button
        size="lg"
        variant="secondary"
        className={cn("mt-10 w-full", highlightedClass)}
        disabled
      >
        Current plan
      </Button>
    );
  }

  if (mode === "founding") {
    return (
      <Button
        size="lg"
        variant="secondary"
        className={cn("mt-10 w-full", highlightedClass)}
        href={href ?? "/dashboard"}
      >
        Open workspace
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      variant={highlighted ? "secondary" : "primary"}
      className={cn("mt-10 w-full", highlightedClass)}
      href={href}
    >
      {label}
    </Button>
  );
}

type ReserveCtaProps = {
  sku: AiReserveSkuId;
  label: string;
  mode: "checkout" | "signin" | "billing" | "founding";
  href?: string;
};

export function MarketingReserveCta({
  sku,
  label,
  mode,
  href,
}: ReserveCtaProps) {
  if (mode === "checkout") {
    return (
      <ReserveCheckoutButton
        sku={sku}
        label={label}
        size="md"
        variant="primary"
        returnPath={PRICING_RETURN}
      />
    );
  }

  if (mode === "founding") {
    return (
      <Button className="w-full" variant="secondary" disabled>
        Unlimited credits
      </Button>
    );
  }

  return (
    <Button className="w-full" variant="secondary" href={href}>
      {label}
    </Button>
  );
}
