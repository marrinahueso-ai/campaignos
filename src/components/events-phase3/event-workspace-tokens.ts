/**
 * Event Workspace redesign palette (UX Pilot) mapped to Tailwind class helpers.
 * ink #1c352d · inksoft #5e6b65 · sage #8ea89d / soft #e6efe9 / deep #5a7568
 * gold #c5a880 / soft #ece2d4 / faint #f4f0ea · ivory #faf8f5 · paper #fff · rule #e6dfd5
 */
export const ew = {
  ink: "text-[#1c352d]",
  inksoft: "text-[#5e6b65]",
  sage: "text-[#8ea89d]",
  sageDeep: "text-[#5a7568]",
  gold: "text-[#c5a880]",
  bgIvory: "bg-[#faf8f5]",
  bgPaper: "bg-white",
  bgSageSoft: "bg-[#e6efe9]",
  bgGoldSoft: "bg-[#ece2d4]",
  bgGoldFaint: "bg-[#f4f0ea]",
  borderRule: "border-[#e6dfd5]",
  borderGold: "border-[#c5a880]",
  fillInk: "bg-[#1c352d]",
  fillSage: "bg-[#8ea89d]",
  fillGold: "bg-[#c5a880]",
} as const;

export const ewNavActive =
  "border-b-2 border-[#1c352d] font-semibold text-[#1c352d]";
export const ewNavIdle =
  "border-b-2 border-transparent text-[#5e6b65] hover:text-[#1c352d]";

export const ewPlanningActive =
  "border-b-2 border-[#8ea89d] font-semibold text-[#1c352d]";
export const ewPlanningIdle =
  "border-b-2 border-transparent text-[#5e6b65] hover:text-[#1c352d]";

export const ewCard =
  "rounded-2xl border border-[#e6dfd5] bg-white shadow-sm";

export const ewHairline = "border-[#e6dfd5]";
