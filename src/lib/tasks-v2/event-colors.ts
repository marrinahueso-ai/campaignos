/** Rotating accent palette for event/campaign group headers (Hey Ralli theme). */
const EVENT_GROUP_PALETTE = [
  "#7a5f9e", // purple
  "#5f735f", // green
  "#c87d3a", // orange
  "#4a7fb5", // blue
  "#b86b55", // terracotta
  "#8b6f4d", // warm brown
] as const;

export function eventGroupAccentColor(eventId: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i += 1) {
    hash = (hash + eventId.charCodeAt(i) * (i + 1)) % EVENT_GROUP_PALETTE.length;
  }
  const paletteIndex = (hash + index) % EVENT_GROUP_PALETTE.length;
  return EVENT_GROUP_PALETTE[paletteIndex] ?? EVENT_GROUP_PALETTE[0];
}
