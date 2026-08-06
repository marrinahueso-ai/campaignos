/**
 * Fixed QR placeholder geometry for AI flyers.
 * Always a square in the lower-right — same relative size every generation
 * so stamped QR codes stay consistent across creations.
 */
export const FLYER_QR_SLOT_FRACTION = 0.11;
export const FLYER_QR_MARGIN_FRACTION = 0.035;

export type FlyerQrStampRect = {
  /** Outer white square size (px). */
  boxSize: number;
  /** Distance from right/bottom edges (px). */
  margin: number;
  left: number;
  top: number;
};

export function resolveFlyerQrStampRect(
  width: number,
  height: number,
): FlyerQrStampRect {
  const side = Math.min(width, height);
  const boxSize = Math.max(48, Math.round(side * FLYER_QR_SLOT_FRACTION));
  const margin = Math.max(8, Math.round(side * FLYER_QR_MARGIN_FRACTION));
  return {
    boxSize,
    margin,
    left: Math.max(0, width - boxSize - margin),
    top: Math.max(0, height - boxSize - margin),
  };
}
