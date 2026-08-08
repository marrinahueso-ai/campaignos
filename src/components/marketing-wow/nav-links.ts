/** Header nav — matches the approved homepage design (Why Hey Ralli · Pricing · Resources · About). */
export const MARKETING_WOW_NAV_LINKS = [
  { href: "/why-hey-ralli", label: "Why Hey Ralli" },
  { href: "/pricing", label: "Pricing" },
  // No standalone /resources page yet — points to the closest shipped
  // equivalent (product tour) until Resources ships as its own page.
  { href: "/features", label: "Resources" },
  { href: "/about", label: "About" },
] as const;
