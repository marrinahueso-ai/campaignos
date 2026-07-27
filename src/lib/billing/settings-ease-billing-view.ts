/**
 * Pure billing Ease view helpers — safe for Server Components and clients.
 * Keep this module free of "use client" so /settings/billing-plan can parse
 * ?view= / ?tab= without crossing the client boundary.
 */

export type SettingsEaseBillingView = "usage" | "plans" | "payment";

export function billingEaseViewFromParam(
  value: string | undefined,
): SettingsEaseBillingView {
  if (value === "plans" || value === "plan") return "plans";
  if (value === "payment" || value === "history") return "payment";
  if (value === "usage" || value === "overview") return "usage";
  return "usage";
}
