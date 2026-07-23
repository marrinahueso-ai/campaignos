/** Client-safe GIF summary returned by `/api/giphy/*` (no API key). */

export type GiphyGifSummary = {
  id: string;
  title: string;
  /** Smaller preview for the grid (fixed_height / fixed_height_small). */
  previewUrl: string;
  /** Size-safe CDN URL for Meta DM image attachment (≤8MB preference). */
  sendUrl: string;
};

export type GiphyProxyResponse = {
  configured: boolean;
  gifs: GiphyGifSummary[];
  message?: string | null;
};
