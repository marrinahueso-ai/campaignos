/** Header nav — matches the approved homepage design (Pricing · Resources · About). */
export const MARKETING_WOW_NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  // No standalone /resources page yet — points to the closest shipped
  // equivalent (product tour) until Resources ships as its own page.
  { href: "/features", label: "Resources" },
  { href: "/about", label: "About" },
] as const;
