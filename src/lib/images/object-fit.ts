import type { CSSProperties } from "react";

/** Resolve Tailwind object-* utilities into a real CSS object-fit value. */
export function objectFitFromClassName(
  className?: string,
): CSSProperties["objectFit"] | undefined {
  if (!className) return undefined;
  if (/\bobject-contain\b/.test(className)) return "contain";
  if (/\bobject-cover\b/.test(className)) return "cover";
  if (/\bobject-fill\b/.test(className)) return "fill";
  if (/\bobject-none\b/.test(className)) return "none";
  if (/\bobject-scale-down\b/.test(className)) return "scale-down";
  return undefined;
}
