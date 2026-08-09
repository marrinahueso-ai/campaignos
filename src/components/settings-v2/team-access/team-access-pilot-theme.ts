/** UX Pilot Team & Access visual tokens (HTML source of truth). */

export const pilot = {
  cream: "#fdfcf7",
  warm: "#f5f2eb",
  dark: "#201b17",
  green: "#586c63",
  greenSoft: "#eef2f0",
  gray: "#737373",
  border: "#e5e1d8",
  clay: "#c07a67",
  claySoft: "#f9f2f0",
  gold: "#d4af37",
} as const;

export const pilotSerif =
  'var(--font-fraunces), "Crimson Pro", Georgia, serif' as const;

export const pilotBtnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-3xl bg-[#201b17] px-8 py-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export const pilotBtnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-3xl border-2 border-[#e5e1d8] bg-white px-6 py-4 text-sm font-bold text-[#201b17] transition hover:bg-[#f5f2eb] disabled:cursor-not-allowed disabled:opacity-60";

export const pilotBtnGhost =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-[#737373] transition hover:bg-[#f5f2eb] hover:text-[#201b17] disabled:cursor-not-allowed disabled:opacity-60";

export const pilotInput =
  "w-full rounded-2xl border-none bg-[#f5f2eb] px-6 py-4 font-medium text-[#201b17] outline-none ring-[#586c63]/20 placeholder:text-[#737373]/60 focus:ring-2 disabled:opacity-60";

export const pilotLabel =
  "px-1 text-xs font-bold uppercase tracking-widest text-[#737373]";

export const pilotSectionLabel =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/60";

export const AVATAR_TONES = [
  "bg-[#586c63] text-[#fdfcf7]",
  "bg-[#c07a67] text-[#fdfcf7]",
  "bg-[#201b17] text-[#fdfcf7]",
  "bg-[#d4af37] text-[#201b17]",
] as const;
