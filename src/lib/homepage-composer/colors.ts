/** Relative luminance 0–1 (sRGB). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick black or white text for readable contrast on a background. */
export function contrastingText(backgroundHex: string): string {
  const onWhite = contrastRatio(backgroundHex, "#ffffff");
  const onBlack = contrastRatio(backgroundHex, "#1c2430");
  return onWhite >= onBlack ? "#ffffff" : "#1c2430";
}

export function averageHex(a: string, b: string): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const mix = pa.map((v, i) => Math.round((v + (pb[i] ?? v)) / 2)) as [
    number,
    number,
    number,
  ];
  return toHex(mix);
}

function parseHex(hex: string): [number, number, number] | null {
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function normalizeHex(value: string, fallback: string): string {
  const cleaned = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toLowerCase()}`;
  return fallback;
}
