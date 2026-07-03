/** scores[dayOfWeek 0–6][hour 0–23], each value 0–1 */
export type PostingTimeScoreGrid = number[][];

export type PostingHeatmapSource =
  | "manual"
  | "suggested"
  | "history"
  | "blended";

export interface PostingHeatmapData {
  timezone: string;
  scores: PostingTimeScoreGrid;
  source: PostingHeatmapSource;
  /** Published posts used for history-based scoring */
  postCount: number;
}

export const WEEK_VIEW_START_HOUR = 6;
export const WEEK_VIEW_END_HOUR = 21;
